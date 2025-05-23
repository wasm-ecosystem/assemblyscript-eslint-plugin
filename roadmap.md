# MemberAccess Rule

前按：本文档聚焦于实现和设计MemberAccess rule，目前已有一版实现，但存在诸多问题，我们将会先给出rule的定义，算法实现，并讨论在生产环境中将会面临的问题以及一些可能的解决思路。

实现目的：
首先需要明确我们的规则在尝试解决什么问题，这里将其简要定义如下：
对于a.b.c.d这一类调用，我们需要对于a.b在多次调用情况下将其抽成变量x，并能够实现对于a.b的自动替换，避免在字节码层面多次求值带来的性能影响。

算法设计：
基于上述规则，这里简要给出一个实现的算法思路，但实际生产环境中还会有许多其他需要考虑的问题，仅靠此算法不能完全覆盖所有场景。这些问题会在后面进行讨论。
我们将算法总结为三个部分：
（1）路径统计与最长公共路径检测
对于a.b.c.d这类结构，我们需要逐层对其解析，形成一个对象链（或称object-chain），得到a-b-c-d
如何实现这个存储结构还有待商榷
（2）作用域分析
需要确保我们替换的变量存在于同一个作用域中
（3）数据流分析
需要确保替换的变量不存在写入或更改的情况，
检查是否作为赋值目标
检查是否用于自增/自减操作
检查是否作为函数参数并被修改

```ts
array[i].prop = 1;
i++; // 索引变化
array[i].prop = 2; // 此处访问了不同元素，不能简单提取

// 如果错误地提取为变量:
const temp = array[i]; // 提取初始索引处的元素引用
temp.prop = 1;
i++; // 索引变化
temp.prop = 2; // 错误：仍然修改的是原始索引处的元素
```

在生产环境下实际需要解决的问题：
Rule本身是十分容易理解的，但是将其用于生产环境下就有可能会面临许多corner case需要解决，如果不将其全面的考虑进去，必然会导致最后实现的rule在不应该发生替换的地方进行替换，甚至改变程序的原有实现逻辑。
这类问题可能较多，且较复杂
我们对一些必须要考虑的case做归纳如下：
（1）需跳过原型方法访问

```ts
const arr = [1, 2, 3];
arr.push(4); // 不应将 arr 提取为变量
arr.length; // 同上
```

解决方案

```ts
function isPrototypeAccess(node: TSESTree.MemberExpression): boolean {
  const props = new Set(["__proto__", "constructor", "prototype"]);
  return node.property.type === "Identifier" && props.has(node.property.name);
}
```

（2）处理解构场景

```ts
const { c, d } = a.b;
```

解决方案

```ts
function isPrototypeAccess(node: TSESTree.MemberExpression): boolean {
  const props = new Set(["__proto__", "constructor", "prototype"]);
  return node.property.type === "Identifier" && props.has(node.property.name);
}
```

（3）对于长链情况的处理
对于a.b.c.d.e.f.g，如果是a.b.c.d.e被多次使用，那么就直接将其抽取为一个变量y，而不是分别先抽取a.b，再抽取a.b.c,以此类推
但也有可能会存在a.b.c被多次使用，而被抽取为变量的情况

1. 长链提取方式的探讨

```ts
// 原始代码
a.b.c.d.e.f.g();
a.b.c.d.e.h();
a.b.c.i();
a.b.c.j();

// 可能的提取方案（贪婪提取）
const temp1 = a.b.c;
const temp2 = temp1.d.e;
temp2.f.g();
temp2.h();
temp1.i();
temp1.j();

// 或者更保守的方案（只提取最频繁的）
const temp = a.b.c;
temp.d.e.f.g();
temp.d.e.h();
temp.i();
temp.j();
```

2. 重叠长链优先级问题

```ts
// 当有多个重叠的长链时，应该如何选择？
a.b.c.d.e.f();
a.b.c.d.e.g();
a.b.c.h();
a.b.c.i();

// 应该优先提取 a.b.c 还是 a.b.c.d.e?
// 这可能需要基于使用频率和长度的权衡算法
```

3. 链中存在副作用

```ts
// 如果链中某部分有副作用，应避免多次提取
a.getB().c.d(); // getB()可能有副作用
a.getB().c.e();

// 错误提取
const temp = a.getB().c; // getB()只执行一次！
temp.d();
temp.e();
```

4. 链的中间部分被重用但两端不同

```ts
a.b.c.d.e.f;
g.h.c.d.e.i;

// 这种情况 c.d.e 被重用，但前后部分不同
// 可能需要特殊处理或放弃提取
```

5. 多条链交错使用

```ts
a.b.c.d();
x.y.z();
a.b.c.e();
x.y.w();

// 由于代码交错，提取变量可能会改变执行顺序
// 需要确保提取后不会影响程序行为
```

（4）作用域及闭包可能带来的问题
（5）变量名发生冲突时的情况（对于autofixer）

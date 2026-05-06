Vue-1
1、初始化状态顺序：prop>methods>data>computed>watch
2、Object.defineProperty只能用来劫持对象，如果是数组有成千上万个项，性能承担不起
3、Object.defineProperty 缺点？对象新增或者删除的属性无法被 set 监听到 只有对象本身存在的属性修改才会被劫持
4、重写数组方法push、pop、shift、unshift、splice、reverse、sort


Vue-2  （模板编译原理）
1、使用了with关键字后，JS引擎无法对这段代码进行优化
2、正则https://juejin.cn/post/6844904153131515912｜ 捕获分组与非捕获分组（ ）｜贪婪与非贪婪模式｜正向肯定查找和正向否定查找


Vue-3
1、渲染页面 new Watcher(vm,updateComponent,null,true)
2、this.get().      watcher
3、把当前的watch推到Dep.target上.         watcher
4、this.getter().  渲染函数.        watcher
5、dep.depend().        dep
6、dep.target.addDep(this)  把自身的dep实例存放在watcher里面.        dep
7、把dep放到deps里面 同时保证同一个dep只被保存到watcher一次  同样的  同一个watcher也只会保存在dep一次。   watcher
8、在watcher中存放dep实例，直接调用dep的addSub方法  把自己--watcher实例添加到dep的subs容器里面。  watcher
9、在调用方法之后把当前的watcher实例从Dep.target移除。    watcher
10、修改数据后，触发dep.notify()，依次执行subs里面的watcher更新方法update()。       dep
11、update方法调get方法，pushTarget(this)，this.getter()，popTarget()。    watcher

总结：
1⃣️Observer 将数据定义为响应式，每个 Observer 实例都有自己的 Dep 来管理依赖。实例化 Wacther 的时候进行求值会触发 getter ，进而执行 dep.depend() 将当前 Wacther 加入 Dep 维护的依赖列表，这就是依赖收集过程。
2⃣️数据发生变化触发 setter 执行 dep.notify，Dep 会执行所有依赖的 update 方法并加入异步更新队列，这就是触发依赖过程。

Vue-4
1、异步更新原理主要思路就是采用微任务优先的方式调用异步方法去执行 nextTick 包装的方法

Vue-5
1、使用双指针移动来进行新老节点的对比；
2、用 isSameVnode 来判断新老子节点的头头 尾尾 头尾 尾头 是否是同一节点 如果满足就进行相应的移动指针(头头 尾尾)或者移动 dom 节点(头尾 尾头)操作
3、如果全都不相等 进行暴力对比 如果找到了利用 key 和 index 的映射表来移动老的子节点到前面去 如果找不到就直接插入
4、对老的子节点进行递归 patch 处理
5、最后老的子节点有多的就删掉 新的子节点有多的就添加到相应的位置

Vue-6
1、mergeOptions合并策略
2、遍历组件的项
3、通过默认策略，options[k] = child[k] ? child[k] : parent[k]

Vue-7
1、组件data必须是一个函数，不知道大家有没有思考过这是为什么呢？
             我们都知道对象是一个引用数据类型，当多次使用同一个组件时，实际上引用的是同一个地址，这样一旦某一个组件数据发生更改，那么会直接影响到其他组件数据，不利于组件的复用，而函数形式则可以避免这种现象的发生，函数中每一次都会返回一个全新的对象，这样多次使用组件时，每一次都是一个全新的对象地址，不会发生数据同步问题。
2、Vue.extend({options})手动生成vue组件，通过组件.$mount()可以获取到组件的真实dom，通过原生的方式插入到document中
3、每一个组件都是一个个 Vue 的实例 都会经历 init 初始化方法
4、Vue.extend 核心思路就是使用原型继承的方法返回了 Vue 的子类 并且利用 mergeOptions 把传入组件的 options 和父类的 options 进行了合并

Vue-8
1、对 watch 每个属性创建一个 watcher , watcher 在初始化时会将监听的目标值缓存到 watcher.value 中, 因此触发 data[key] 的 get 方法, 被对应的 dep 进行依赖收集; 当 data[key] 发生变动时触发 set 方法, 执行 dep.notify 方法, 通知所有收集的依赖 watcher , 触发收集的 watch watcher , 执行 watcher.cb , 也就是 watch 中的监听函数


Vue-jsx.      
https://v2.cn.vuejs.org/v2/guide/render-function.html
// @returns {VNode}
createElement(
  // {String | Object | Function}
  // 一个 HTML 标签名、组件选项对象，或者
  // resolve 了上述任何一种的一个 async 函数。必填项。
  'div',

  // {Object}
  // 一个与模板中 attribute 对应的数据对象。可选。
  {
    // (详情见下一节)
  },

  // {String | Array}
  // 子级虚拟节点 (VNodes)，由 `createElement()` 构建而成，
  // 也可以使用字符串来生成“文本虚拟节点”。可选。
  [
    '先写一些文字',
    createElement('h1', '一则头条'),
    createElement(MyComponent, {
      props: {
        someProp: 'foobar'
      }
    })
  ]
)

*透传，利用$attrs和$listener 可以设置默认值和透传给孙组件

# Vue原理学习
## 响应式系统
## 虚拟DOM
## 编译器
## 组件系统
## 声明周期系统
## 依赖注入系统
## 事件系统
## 调度系统

// 实现一个函数，模拟异步请求，要求：

// 使用Promise实现
// 支持超时处理（3秒超时）
// 有30%的概率失败
function mockRequest(data) {
    return new Promise((resolve, reject) => {
        // 模拟网络延迟1～2秒
        const delay = Math.random() * 1000 + 1000;
        // 主要的异步操作
        const mainPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                // 30%的概率失败
                if (Math.random() < 0.3) {
                    reject('请求失败');
                } else {
                    resolve(data);
                }
            }, delay);
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject('超时');
            }, 3000);
        });
        
        Promise.race([mainPromise, timeoutPromise])
            .then(resolve)
            .catch(reject);
	})
}

// 请实现一个深拷贝函数，要求处理循环引用、Date、RegExp、Function等特殊类型
function deepClone(obj, map = new WeakMap()) {
    // 处理null和基本数据类型
    if (obj === null || typeof obj !== 'object') return obj;
    // 处理Date
    if (obj instanceof Date) return new Date(obj);
    // 处理RegExp
    if (obj instanceof RegExp) return new RegExp(obj);
    // 处理Function
    if (typeof obj === 'function') return obj;

    // 处理循环引用
    if (map.has(obj)) return map.get(obj);
    const cloned = Array.isArray(obj) ? [] : {};
    map.set(obj, cloned);
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key], map);
        }
    }
}

// 实现一个并发控制的异步任务调度器
class TaskScheduler {
    constructor(concurrency) {
        // 最大并发数
        this.concurrency = concurrency;
        // 正在执行的任务数
        this.runningTasks = 0;
        // 任务队列
        this.taskQueue = [];
    }
    
    add(promiseCreator) {
        // 添加任务，返回Promise
        return new Promise((resolve, reject) => {
            this.taskQueue.push({
                promiseCreator,
                resolve,
                reject
            });
            // 尝试执行任务
            this.process();
        });
    }
    async process() {
        if (this.runningTasks >= this.concurrency || !this.taskQueue.length) return;
        this.runningTasks++;
        const { promiseCreator, resolve, reject } = this.taskQueue.shift();

        try {
            const result = await promiseCreator();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.runningTasks--;
            // 继续处理队列中的任务
            this.process();
        }
    }
}

const scheduler = new TaskScheduler(2);
const addTask = (time, order) => {
    scheduler.add(() => new Promise(resolve => {
        setTimeout(() => {
            console.log(order);
            resolve();
        }, time);
    }));
};

// addTask(1000, '1');
// addTask(500, '2');
// addTask(300, '3');
// addTask(400, '4');


function Parent() {
  this.name = 'parent';
}
Parent.prototype.getName = function() {
  return this.name;
};

function Child() {
  Parent.call(this);
  this.age = 18;
}

Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;
Child.prototype.getAge = function() {
  return this.age;
};

const child = new Child();
console.log(child.getName()); // ?
console.log(child instanceof Parent); // ?
console.log(child.__proto__ === Child.prototype); // ?
console.log(Child.prototype.__proto__ === Parent.prototype); // ?

//总结： 原型链示意图













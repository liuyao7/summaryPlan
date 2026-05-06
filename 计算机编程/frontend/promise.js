// then方法必须返回一个promise对象
// 只要then方法返回的是一个promise对象，那么后面的then就会等待这个promise执行完毕之后再执行
// 就算前边的.then方法中catch函数返回了一个值，他返回的也是一个fufilled状态的promise对象，
// 如果then方法给的是两个不是函数的参数，那么这两个参数就会被忽略，返回的还是一个fulfilled状态的promise对象

class Promise {

    constructor(handleFunc) {
        this.status = 'pending'
        this.value = null
        this.fulfilledList = [];
        this.rejectedList = [];

        handleFunc(this.triggerResolve.bind(this), this.triggerReject.bind(this));
    }

    triggerResolve(val) {
        // 当前的promise状态已经变为了resolve，那么就要执行后续的操作
        setTimeout(() => {
            if (this.status !== 'pending') return;

            if (val instanceof Promise) {
                val.then(
                    res => this.triggerResolve(res),
                    err => this.triggerReject(err)
                );
            } else {
                // 传入的是一个普通值
                this.status = 'fulfilled';
                this.value = val;
                this.triggerFulfilled(val);
            }
        }, 0)
    }

    triggerFulfilled(val) {
        this.fulfilledList.forEach(fn => fn(val));
        this.fulfilledList = [];
    }

    triggerReject() {
        setTimeout(() => {
            if (this.status !== 'pending') return;
            this.status = 'rejected';
            this.value = val;
            this.triggerRejected(val);
        }, 0)

    }
    triggerRejected(val) {
        this.rejectedList.forEach(fn => fn(val));
        this.rejectedList = [];
    }

    then(onFilfilled, onRejected) {
        const { status, value } = this;
        return new Promise((onNextFulfilled, onNextRejected) => {

            function onFinalFulfilled(val) {
                if (typeof onFilfilled !== 'function') {
                    onNextFulfilled(val);
                } else {
                    try {
                        const res = onFilfilled(val);
                        if (res instanceof Promise) {
                            res.then(onNextFulfilled, onNextRejected);
                        } else {
                            onNextFulfilled(res);
                        }
                    } catch (error) {
                        onNextRejected(error);
                    }
                }
            };
            function onFinalRejected(err) {
                if (typeof onRejected !== 'function') {
                    onNextRejected(err);
                } else {
                    try {
                        const res = onRejected(err);
                        if (res instanceof Promise) {
                            res.then(onNextFulfilled, onNextRejected);
                        } else {
                            onNextFulfilled(res);
                        }
                    } catch (error) {
                        onNextRejected(error);
                    }
                }
            };

            switch(status) {
                case 'pending': 
                    this.fulfilledList.push(onFinalFulfilled);
                    this.rejectedList.push(onRejected);
                    break;
                case 'fulfilled':
                    onFinalFulfilled(value);
                    break;
                case 'rejected':
                    onFinalRejected(value);
                    break;
            }
        });
    }
    catch(onRejected) {
        return this.then(null, onRejected);

    }

    static resolve(value) {
        if (value instanceof Promise) {
            return value;
        }
        return new Promise(resolve => resolve(value));
    }

    static reject() {
        return new Promise((resolve, reject) => reject());
    }

    static all(list) {
        return new Promise((resolve, reject) => {
            let count = 0;
            const result = [];
            for (let i = 0; i < list.length; i++) {
                list[i].then(res => {
                    count++;
                    result[i] = res;
                    if (count === list.length) resolve(result);
                }, err => reject(err));
            }
        });
    }

    static race(list) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < list.length; i++) {
                list[i].then(res => resolve(res), err => reject(err));
            }
        });
    }
}

const promise1 = new Promise((resolve, reject) => {
    console.log('Promise内部执行');
    resolve('Hello world');
});

promise1
    .then(res => {console.log('resolve1', res); return new Promise(resolve => resolve('Hello world2'));})
    .then(res => console.log('resolve2', res))
console.log('同步执行');


// const promise = function (time) {
//     return new Promise((resolve, reject) => {
//         setTimeout(resolve, time);
//     });
// }

// Promise.all([promise(1000), promise(2000)])
//     .then(res => console.log('resolve', res));

function createGetter() {
    return function get(target, key, receiver) {
        console.log('get', key);
        // 1. 获取值
        const res = Reflect.get(target, key, receiver);
        // 2. 收集依赖
        // track(target, key);
        // 3. 返回值
        return res;
    }
}

function createSetter() {
    return function (target, key, value, receiver) {
        console.log('set', key, value);
        target[key] = value;
        const res = Reflect.set(target, key, value, receiver);
        // 触发更新
        // trigger(target, key);
        return res;
    }
}

/**
 * 
 * @param {*} target 目标对象
 * @param {*} proxyMap 弱引用，记录重复代理
 * @param {*} baseHandlers getter setter
 * @returns 
 */
function createReactiveObject(target, proxyMap, baseHandlers) {
    // 只代理引用类型
    if (typeof target !== 'object' || target === null) {
        console.warn(`reactive only accepts objects`);
        return target;
    }

    // 已经被代理过了，直接返回
    let proxy = proxyMap.get(target);
    if (proxy) {
        return proxy;
    }

    proxy = new Proxy(target, baseHandlers);

    proxyMap.set(target, proxy);

    return proxy;
}    

const handlers = {
    get: createGetter(),
    set: createSetter()
};

const reactiveMap = new WeakMap();

function reactive(target) {
    return createReactiveObject(target, reactiveMap, handlers);
}


// track收集依赖结构
// 最外层是targetMap，键是被代理的对象，值是depsMap
// depsMap的键是被代理对象的key，值是dep
// dep是一个Set结构，存储所有与该key相关联的副作用函数
const targetMap = new WeakMap();
let acticeEffect = null;

function track(target, key) {
    if (activeEffect === null) {
        return;
    }

    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    
    let deps = depsMap.get(key);
    if (!deps) {
        deps = new Set();
    }

    if (!deps.has(activeEffect)) {
        deps.add(activeEffect);
    }

    depsMap.set(key, deps);

}


function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return;
    }
    
    const deps = depsMap.get(key);
    if (!deps) {
        return;
    };

    deps.forEach(effect => {
        effect();
    });
}


function effect(fn, options = {}) {
    const { lazy = false, scheduler } = options;
    
    // 创建一个runner对象，包含 run 和 stop 方法
    const runner = {
        run() {
            fn();
        },
        stop() {
            // 停止逻辑可扩展，例如清理依赖
        }
    };

    // 将scheduler附加到runner上，以便在依赖变化时调用
    runner.scheduler = scheduler;

    // 如果不是lazy，立即执行
    if (!lazy) {
        runner.run();
    };

    return runner;
    
}

// 实现computed
function myComputed(getter) {
    // computed接受一个函数作为参数，所以这里getter是一个函数
    // 这里之所以参数是一个getter，是因为此时我们操作的是响应式数据的值，这个值已经被代理了
    // 所以要通过getter去拿，可以触发之前设置的proxy.get，从而进行收集依赖函数
    let value;
    let dirty = true; // 是否需要重新计算

    const effectRunner = effect(() => {
        value = getter(); // 执行getter，获取最新值
        dirty = false; // 计算完成，标记为不脏
    }, {
        lazy: true, // 懒执行
        scheduler() {
            dirty = true; // 当依赖变化时，标记为脏
        }
    });

    const computed = {
        get value() {
            if (dirty) {
                effectRunner.run(); // 重新计算
            }

            return value;
        }
    }

    return computed;
}
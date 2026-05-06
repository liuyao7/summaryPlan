const { transformSync } = require('@babel/core');


const sourceCode = `
function getAge() {
    var age = 18;
    console.log(age);
    var name = 'xiaoming';
    console.log(name);
}`;

const uglifyPlugin = () => {
    return {
        visitor: {
            // 这是一个别名，用于捕获所有作用域节点：函数、类的函数、函数表达式、语句块、if else、 while、 for
            Scopable(path) {
                // path.scope.bindings 取出作用域内的所有变量
                // 取出进行重命名
                Object.entries(path.scope.bindings).forEach(([key, binding]) => {
                    const newName = path.scope.generateUid(); // 生成一个新的变量名,并且不会和本地定义的变量名冲突
                    binding.path.scope.rename(key, newName);
                });
            }
        }
    }
};

const targetCode = transformSync(sourceCode, {
    plugins: [uglifyPlugin]
});

console.log(targetCode.code);

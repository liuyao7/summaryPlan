// 使用babel修改函数名

const parser = require('@babel/parser'); // 引入解析器
const traverse = require('@babel/traverse').default; // 引入遍历器
const generator = require('@babel/generator').default; // 引入生成器

// 源代码
const code = `const hello = () => { };`

// 1. 源代码解析成ast
const ast = parser.parse(code);

// 2. 转换
const visitor = {
    // traverse 遍历到函数声明时，修改函数名
    Identifier(path) {
        if (path.node.name === 'hello') {
            path.node.name = 'demo';
        }
    }
}

traverse(ast, visitor);

// 3. 生成
const result = generator(ast, {}, code);

console.log(result.code);

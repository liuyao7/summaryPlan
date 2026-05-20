// 使用babel修改箭头函数为function表达式
/* const core = require("@babel/core");
let arrowFunctionPlugin = require("babel-plugin-transform-es2015-arrow-functions");

let sourceCode = `
const sum = (a, b) => a + b;
`;

let targetCode = core.transform(sourceCode, {
    plugins: [arrowFunctionPlugin]
});

console.log(targetCode.code); */

// 手写简易版babel插件，所谓babel插件其实就是一个对象，对象里有一个visitor属性，它也是一个对象，key为类型，value为函数，接受path作为参数。

/* const core = require("@babel/core");
let sourceCode = `
const sum = (a, b) => {
    return a + b;
};
`;

let arrowFunctionPlugin = {
    visitor: {
        ArrowFunctionExpression(path) {
            if (path.node.type === 'ArrowFunctionExpression') {
                path.node.type = 'FunctionExpression';
            }
        }
    }
}

let targetCode = core.transform(sourceCode, {
    plugins: [arrowFunctionPlugin]
});

console.log(targetCode.code); */

// 复杂版本 - 无this简介版箭头函数
/* const core = require("@babel/core");
let types = require("@babel/types"); // 用来生成或者判断节点的AST语法树的节点
let sourceCode = `
const sum = (a, b) => a + b;
`;

let arrowFunctionPlugin = {
    visitor: {
        ArrowFunctionExpression(path) {
            if (path.node.type === 'ArrowFunctionExpression') {
                path.node.type = 'FunctionExpression';
            }

            if (!types.isBlockStatement(path.node.body)) {
                // 如果箭头函数的函数体不是块级语句，则需要把表达式转换成块级语句
                path.node.body = types.blockStatement([
                    types.returnStatement(path.node.body) // 把表达式转换成return语句
                ]);
            }
        }
    }
}

let targetCode = core.transform(sourceCode, {
    plugins: [arrowFunctionPlugin]
});

console.log(targetCode.code); */


// 复杂版本 - 处理this
/**
 * 思路：
 * 第一步：找到当前箭头函数要使用哪个作用域内的this，暂时称为父作用域
 * 第二步：往父作用域中加入_this变量，也就是var _this=this
 * 第三步：找出当前箭头函数内所有用到this的地方
 * 第四步：将当前箭头函数中的this，统一替换成_this
 */
/* const core = require("@babel/core");
let types = require("@babel/types"); // 用来生成或者判断节点的AST语法树的节点
let sourceCode = `
const sum = (a, b) => {
    console.log(this);
    return a + b
};
`;

function hoistFunctionEnvironment(path) {
    // 第一步：确定当前箭头函数要使用哪个地方的this
    // path.findParent 是 Babel 提供的一个方法，用于在 AST 中向上查找满足特定条件的父节点。向上查找
    const thisEnv = path.findParent((p) => {
        // 找到第一个函数或者全局作用域
        return (p.isFunction() && !p.isArrowFunction()) || p.isProgram();
    });
    
    // 第二步：在父作用域中加入_this变量
    thisEnv.scope.push({
        id: types.identifier("_this"), // 变量名
        init: types.thisExpression() // 变量值
    });

    // 第三部：找出当前箭头函数内所有用到this的地方
    // let thisPaths = [];
    path.traverse({
        ThisExpression(thisPath) {
            // thisPaths.push(thisPath);
            // 第四步：将当前箭头函数中的this，统一替换成_this
            thisPath.replaceWith(types.identifier("_this"));
        }
    });
}

let arrowFunctionPlugin = {
    visitor: {
        ArrowFunctionExpression(path) {
            hoistFunctionEnvironment(path);
            if (path.node.type === 'ArrowFunctionExpression') {
                path.node.type = 'FunctionExpression';
            }

            if (!types.isBlockStatement(path.node.body)) {
                // 如果箭头函数的函数体不是块级语句，则需要把表达式转换成块级语句
                path.node.body = types.blockStatement([
                    types.returnStatement(path.node.body) // 把表达式转换成return语句
                ]);
            }
        }
    }
}

let targetCode = core.transform(sourceCode, {
    plugins: [arrowFunctionPlugin]
});

console.log(targetCode.code); */

// log插件，给console.log增加文件名和行号信息
const core = require("@babel/core");
let types = require("@babel/types"); // 用来生成或者判断节点的AST语法树的节点
const pathlib = require("path");
let sourceCode = `
const sum = (a, b) => {
    console.log('log插件');
};
`;

let logPlugin = {
    visitor: {
        // 找到console的节点，增加文件名和行号信息
        CallExpression(path, state) {
            console.log(state);
            const {node} = path;
            if (types.isMemberExpression(node.callee)) {
                if (node.callee.object.name === "console") {
                    // 找到console
                    if (["log", "info", "warn", "error"].includes(node.callee.property.name)) {
                        //找到符合的方法名
                        const { line, column } = node.loc.start; // 获取行号
                        node.arguments.push(types.stringLiteral(`(line: ${line}, column: ${column})`));
                        const filename = state.file.opts.filename || "unknown file";
                        // 输出文件的相对路径
                        const relativeName = pathlib
                            .relative(__dirname, filename)
                        .replace(/\\/g, "/"); // 兼容window
                        node.arguments.push(types.stringLiteral(`[${relativeName}]`));
                    };
                }
            }
        },
    }
}

let targetCode = core.transform(sourceCode, {
    plugins: [logPlugin],
    filename: "test.js"
});

console.log(targetCode.code);
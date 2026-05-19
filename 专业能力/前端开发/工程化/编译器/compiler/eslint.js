// 前置小知识：babel在ast遍历也是有生命周期的，有两个钩子：遍历开始或结束之后，它们可以用于设置或者清理/分析工作

// 简易版本eslint
const core = require("@babel/core");
const pathlib = require("path");

const sourceCode = `
var a = 1;
console.log(a);
var b = 2;
`;

// no-console 禁用console fix=true：自动修复
const eslintPlugin = ({ fix }) => {
    return {
        // 遍历前
        pre(file) {
            file.set("errors", []);
        },
        visitor: {
            // CallExpression: 函数调用表达式
            CallExpression(path, state) {
                const errors = state.file.get("errors");
                const { node } = path;
                if (node.callee.object?.name === 'console') {
                    errors.push(
                        path.buildCodeFrameError("代码中不能出现console语句", Error)
                    );
                    if (fix) {
                        path.parentPath.remove(); // 删除父节点ExpressionStatement
                    }
                }
            }
        },
        // 遍历后
        post(file) {
            const errors = file.get("errors");
            console.log(...errors);
        }
    }
}

let targetCode = core.transformSync(sourceCode, {
    plugins: [eslintPlugin({ fix: true })],
});

console.log(targetCode.code);

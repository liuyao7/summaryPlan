// 实现按需加载

/**
 * 整体方案：
 * 1. 在插件中拿到在插件调用时传递的参数libraryName
 * 2. 获取import节点，找出引入模块是libraryName的语句
 * 3. 进行批量替换旧节点
 */

const core = require("@babel/core");
const types = require("@babel/types"); // 用来生成或者判断节点的AST语法树的节点

// 源代码
let sourceCode = `
import { Button, DatePicker } from 'antd';
import { Demo } from './Demo';
`;

const importPlugin = ({ libraryName, libraryDirectory = 'lib' }) => {
    console.log(libraryName);
    return {
        visitor: {
            ImportDeclaration(path, state) {
                console.log(state.opts);
                // const { libraryName, libraryDirectory = 'lib' } = state.opts;
                const { node } = path;

                const { specifiers } = node; // 获取批量导入声明数组
                // 如果当前的节点的模块名称是我们需要的库的名称，并且导入不是默认导入才会进来
                if (
                    node.source.value === libraryName &&
                    !types.isImportDefaultSpecifier(specifiers[0]) 
                ) {
                    // 遍历批量导入声明数组
                    const declaration = specifiers.map((specifier) => {
                        const { imported, local } = specifier;
                        // 返回一个importDeclaration节点
                        return types.importDeclaration(
                            [
                                types.importDefaultSpecifier(local),
                            ],
                            types.stringLiteral(
                                libraryDirectory
                                    ? `${libraryName}/${libraryDirectory}/${imported.name}`
                                    : `${libraryName}/${imported.name}`
                            ),
                        );
                    });

                    // 替换旧节点
                    path.replaceWithMultiple(declaration);
                }
            },
        }
    }
}

let targetCode = core.transform(sourceCode, {
    plugins: [
        [
            importPlugin,
            { libraryName: 'antd' } // 这种传递方式从state.opts里获取
        ]
    ],
    // plugins: [
    //     importPlugin({ libraryName: 'antd' }) // 这种直接在插件调用时传递参数
    // ],
});

console.log(targetCode.code);
# 完整的编译器流程
1. Parsing（解析过程）：要做的有词法分析、语法分析、构建AST（抽象语法树）；
2. Transfomation(转化过程)：将上一步的解析结果进行转化处理，形成一个新的表现形式；
3. Code Generation（代码生成）：将上一步处理好的内容转化成新的代码；

# 微观
1. 将代码解析为tokens。这个过程需要tokenzier分词器函数，整体思路就是通过遍历字符串的方式，对每个字符按照规则进行判断，最终生成tokens数组.
`
[
    {
        type: 'keyword',
        value: 'let'
    },
    {
        type: 'identifier',
        value: 'a'
    },
    {
        type: 'operator',
        value: '='
    },
    {
        type: 'number',
        value: '1'
    }
]
`
2. 将生成好的tokens转化为AST。
`
{
    type: 'Program',
    body: [
        {
            type: 'VariableDeclaration',
            declarations: [
                {
                    type: 'VariableDeclarator',
                    id: {
                        type: 'Identifier',
                        name: 'a'
                    },
                    init: {
                        type: 'Literal',
                        value: 1,
                        raw: '1'
                    }
                }
            ],
            kind: 'let'
        }
    ],
}
`
3. 根据当前的AST生成一个新的AST，这个过程可以是相同语言，或者可以直接将AST翻译为其他语言。
4. 遍历新的AST节点，根据指定规则生成最终代码。
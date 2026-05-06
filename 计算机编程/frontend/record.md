1. `const div = <div>测试</div>` 
    - 这样写的时候前提是在jsx文件中，解析工具会自己去找React这个引入，通过React.createElement()来创建一个元素，所以没有React会报错，可以自定义React这个名称，例如：


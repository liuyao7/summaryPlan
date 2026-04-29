/* 
 测试字符类型和布尔类型
*/
public class VariableTest2 {
    public static void main(String[] args) {
        // 字符类型： char（2字节）
        // 表示形式1: 使用''，内部只能有一个字符
        char c1 = 'A';
        System.out.println(c1);

        // 表示形式2: 使用Unicode编码
        char c2 = '\u0041';
        System.out.println(c2);

        // 表示形式3: 转义字符
        char c3 = '\n';
        System.out.println(c3);

        // 表示形式4: 使用ASCII码值
        char c4 = 90;
        System.out.println(c4);

        // 布尔类型： boolean（4字节）
        boolean b1 = true;
        System.out.println(b1);
    }
}

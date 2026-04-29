/* 
1. 可以做运算的基本数据类型有7种：byte,short,int,long,float,double,char
2. 运算规则包括
    2.1 不同类型的变量在做运算的时候，会自动类型提升
    2.2 强制类型转换

规则：当容量小的变量与容量大的变量做运算时，结果自动转换为容量大的数据类型
    byte、short、char --> int --> long --> float --> double
    特别的：byte和short计算的时候，结果一定是int类型
说明：此时的容量小或大，并非指占用的内存空间的大小，而是指表示数据的范围大小。
     long（8字节）、float（4字节）
*/

public class IdentifierTest2 {
    public static void main(String[] args) {
        byte b1 = 12;
        int a = 123234123;
        long l1 = 1234567890L;
        float f1 = 123.4f;
        double d1 = 123.4;
        System.out.println(b1 + a); // 自动类型提升，将byte提升至int
        System.out.println(a + f1); // 自动类型提升，将int提升至float
        System.out.println(l1 + f1); //
        System.out.println(f1 + d1); // 自动类型提升，将float提升至double
        // System.out.println(b1 + f1); // 编译错误，因为byte和float不能直接运算

        // 注意1
        byte b2 = 12;
        long l11 = 123L;
        long l22 = 123; // 理解为自动类型提升，将int提升至long

        // long l44 = 123123123123; // 123123123123理解为int类型，因为超出了int的范围，所以编译错误
        long l44 = 123123123123L; // 正确，因为123123123123L是long类型


        // 注意2
        float f2 = 123.4f;
        // float f3 = 123.4; // 不满足自动类型提升的规则（double --> float），编译错误


        // 注意3
        // 规定1:整形常量，规定为是int类型
        byte b3 = 12;

        int i11 = b3 + 1; // 自动类型提升，将byte提升至int

        // 规定2:浮点型常量，默认是double类型
        float f4 = b3 + 1.1f; // 自动类型提升，将int提升至float
        double f5 = b3 + 1.1;

        // 注意4:
        
    }
}

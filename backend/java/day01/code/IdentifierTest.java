public class IdentifierTest {
    public static void main(String[] args) {
        byte b1 = 12;
        byte b2 = 127;
        // byte b3 = 128; // error，超出了byte的范围

        short s1 = 1234;

        int a = 123234123;

        long l1 = 1234567890L; // 声明long类型的时候，需要提供后缀‘l’或者‘L’

        // 1字节 = 8位 ，2的8次方 = 256
        // 1字节 / 2字节 / 4字节 / 8字节
        // 开发中，定义整数类型的时候，如果没有特别大的数，一般使用int类型



        double d1 = 123.4;
        // 声明float类型的时候，需要提供后缀‘f’或者‘F’
        float f1 = 123.4f;

        // float 4字节
        // double 8字节

        // 1 开发中，定义浮点数类型的时候，通常使用double类型，因为精度更高
        // 2 float类型表述的范围大于long类型的表数范围，但是精度不高,如果需要极高的精度，可以使用BigDecimal

        System.out.println(0.1 + 0.2);
    }
}

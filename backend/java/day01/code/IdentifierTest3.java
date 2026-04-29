/* 
强制类型转换
规则：
1. 大类型转到小类型
2. 强转符：（）。在（）内指明要转换为的数据类型
3. 强制类型转换过程中，可能导致精度降低

*/

public class IdentifierTest3 {
    public static void main(String[] args) {
        int i2 = 123;

        // 强制类型转换
        byte b4 = (byte) i2;
        System.out.println(b4);


        long l1 = 123;
        short s2 = (short) l1;
        System.out.println(s2);


        // 精度损失的例子
        double d1 = 123.4;
        int i3 = (int) d1;
        System.out.println(i3); // 123
        
    }
}

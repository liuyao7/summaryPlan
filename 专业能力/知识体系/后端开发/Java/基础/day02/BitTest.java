/* 
 测试位运算符
 << >> >>> & | ^ ~
 说明： 都是针对数值类型的常量进行运算，运算的结果也是数值
        每向左移一位，相当于在原有的基础上乘以2
        每向右移一位，相当于在原有的基础上除以2
*/
public class BitTest {
    public static void main(String[] args) {
        int num1 = -7;
        // System.out.println("num1 << 1 = " + (num1 << 1));
        // System.out.println("num1 << 2 = " + (num1 << 2));
        System.out.println("num1 << 1 = " + (num1 << 1));

        // System.out.println("num1 >> 1 = " + (num1 >> 1));
        // System.out.println("num1 >> 2 = " + (num1 >> 2));
        // System.out.println("num1 >> 3 = " + (num1 >> 3));

        // System.out.println("num1 >>> 1 = " + (num1 >>> 1));
        // System.out.println("~num1 = " + ~num1);
        // System.out.println("7 & 11 = " + (7 & 11));
        // System.out.println("7 | 11 = " + (7 | 11));
        // System.out.println("7 ^ 11 = " + (7 ^ 11));
    }
}
 
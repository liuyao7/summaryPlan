/* 
String


*/

public class IdentifierTest4 {
    public static void main(String[] args) {
        String str1 = "123";
        String str2 = "";
        String str3 = "a";
        

        // 字符串拼接
        System.out.println(str1 + str2); // 123
        System.out.println(str1 + str3); // 123a
        System.out.println(str1 + 123); // 123123
        System.out.println("abc" + null); // abcnull


        // 如何将String类型转换为基本数据类型
        int num = 1;
        String str4 = "";
        String str5 = num + str4;
        // 方式1
        int num2 = Integer.parseInt(str5); // 字符串转整型
        System.out.println(num2 + num); // 1
        
        // 方式2
        int num3 = Integer.valueOf(str4); // 字符串转整型
        System.out.println(num3 + num); // 2

        // 定义数据类型的时候考虑
        // 1. 够用
        // 2. 够用的情况下，尽量用小的
        // 3. 够用且小的前提下，考虑是否需要运算
        // 4. 考虑运算过程中，是否需要强制类型转换
    }
}

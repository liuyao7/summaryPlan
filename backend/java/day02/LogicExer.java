/* 
 测试逻辑运算符
*/
public class LogicExer {
    public static void main(String[] args) {
        int a,b;
        a = b = 20;
        boolean bo1 = (++a % 3 == 0) && (a++ % 7 ==0);
        System.out.println("a = " + a + ",bo1 = " + bo1);
    }
}

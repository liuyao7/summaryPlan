/* 
 测试SwitchCase
*/
public class SwitchCase {
    public static void main(String[] args) {
        int score = 92;
        swich(score){
            case 0:
                System.out.println("不及格");
                break;
            case 100:
                System.out.println("及格");
                break;
            default:
                System.out.println("成绩有误");
        }
    }
}

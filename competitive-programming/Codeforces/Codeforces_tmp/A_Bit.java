import java.util.*;
public class A_Bit {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int t = input.nextInt();
        int a = 0;
        for(int i = 0; i < t; i++){
            String s = input.nextLine();
            if(s == "X++" || s == "++X"){
                a = a + 1;
            }
            else if(s == "X--" || s == "--X"){
                a = a - 1;
            }
        }
        System.out.print(a);
    }
}
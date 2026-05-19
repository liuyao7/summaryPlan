public class OneArray {
    public static void main(String[] args) {
        // int[] numbers = {24, 5, 12, 99, 100, 123, 54, 23, 12, 34, 65};
        // System.out.println("The length of numbers is: " + numbers.length);
        // for (int i = 0; i < numbers.length; i++) {
        //     System.out.println("numbers[" + i + "] = " + numbers[i]);
        // }

        double[] prices;
        prices = new double[]{23.5, 12.99, 15.5, 23.99, 12.5, 10.99};
        for (int i = 0; i < prices.length; i++) {
            System.out.println("prices[" + i + "] = " + prices[i]);
        }


        String[] foods;
        foods = new String[]{"Pizza", "Burger", "Fried Chicken", "Pasta", "Fish and Chips"};
        for (int i = 0; i < foods.length; i++) {
            System.out.println("foods[" + i + "] = " + foods[i]);
        }


    }
}
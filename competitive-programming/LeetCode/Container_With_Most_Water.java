class Solution {
    public int maxArea(int[] height) {
        int max = Integer.MIN_VALUE;
        for(int i = 0; i < height.length; i++){
            for(int j = 0; j < height.length; j++);
                if(i == j){
                    j++;
                }
                int area = Math.abs(i - j) * 

        }
        return max;
    }
}
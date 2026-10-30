class Solution {
    public int[] twoSum(int[] nums, int target) {
        int[] twoSumArray = new int [2];
        for(int i = 0; i < nums.length - 1; i++){
            for(int j = 0; j < nums.length; j++){
                if(i == j) j += 1;
                if(nums[i] + nums[j] == target){
                    twoSumArray[0] = i;
                    twoSumArray[1] = j;
                }
            }    
        }
        return twoSumArray;
    }
}
class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {

        // * Initialize the answer variable
        double median;
        
        // * Get the length of the first array
        int nums1Length = nums1.length;

        // * Get the length of the second array
        int nums2Length = nums2.length;

        // * Get the length of the
        int newArrayLength = nums1Length + nums2Length;

        // * Initialize the new array
        int [] newArray = new int [newArrayLength];

        // * Merging two arrays
        System.arraycopy(nums1, 0, newArray, 0, nums1Length);
        System.arraycopy(nums2Length, 0, newArray, nums1Length, nums2Length);

        // * Sorting the array
        Arrays.sort(newArray);
        
        // * Condition for the even numbered arrays
        if(newArrayLength % 2 == 0){
            median = (newArray[newArrayLength / 2] + newArray[(newArrayLength / 2) + 1]) / 2.0;
        }

        // * Condition for the odd numbered arrays
        else if(newArrayLength % 2 != 0){
            median = newArray[(newArrayLength / 2) + 1];
        }

        // TODO : Farhan Sadeek
        return median;
    }
}
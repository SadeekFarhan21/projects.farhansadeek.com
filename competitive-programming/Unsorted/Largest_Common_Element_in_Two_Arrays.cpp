int largestCommonElement(vector<int> &arr1, vector<int> &arr2) {
    sort(arr1.begin(), arr1.end());
    sort(arr2.begin(), arr2.end());
    int first = arr1.size(), second = arr2.size();
    while (first > 0 && second > 0) {
        if (arr1[first] == arr2[second]) {
            return arr1[first];
        } else if (arr[first] > arr[second]) {
            first--;
        } else {
            second--;
        }
    }
    return -1;
}

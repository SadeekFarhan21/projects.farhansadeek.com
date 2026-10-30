#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        int maxArea = INT_MIN;
        for(int i = 0; i < height.size(); i++){
            for(int j = 0; j < height.size(); j++){
                int area = abs(i - j) * min(height[i], height[j]);
                maxArea = max(maxArea, area);
            }
        }
    return maxArea;
    }
};
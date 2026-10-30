#include <bits/stdc++.h>
#include <climits>
using namespace std;
#define int long long 

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        int n; cin >> n;
        vector <int> candies(n);
        vector<int> types(n);
        for (int i = 0; i < n; i++) {
            cin >> candies[i];
        }
        for (int i = 0; i < n; i++) {
            cin >> types[i];
        }

        // Type 1 is default
        int running_sum = 0;
        int answer1 = LLONG_MIN;
        int largest_element = LLONG_MIN;
        for (int i = 0; i < n; i++) {
            int value = 0;
            if (types[i] == 1) {
                value = candies[i];
                largest_element = max(largest_element, value);
            } 
            running_sum += value;
            if (running_sum < 0) {
                running_sum = 0;
            } else {
            answer1 = max(running_sum, answer1); }
        }
        if (answer1 < 0) {
            answer1 = largest_element;
        }

        int answer2 = LLONG_MIN; running_sum = 0; largest_element = LLONG_MIN;
        // Type 0 is default
        for (int i = 0; i < n; i++) {
            int value = 0;
            if (types[i] == 0) {
                value = candies[i];
                largest_element = max(largest_element, value);
            }
            running_sum += value;
            if (running_sum < 0) {
                running_sum = 0;
            } else {
            answer2 = max(running_sum, answer2);}
        }
        if (answer2 < 0) {
            answer2 = largest_element;
        }
        cout << max(answer1, answer2) << "\n";
    }
    return 0;
}
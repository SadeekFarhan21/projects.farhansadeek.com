#include "bits/stdc++.h"
using namespace std;

int longest_distinct_array(vector <int> numbers){
    unordered_map <int, int> last_seen; // stores the previous location of the numbers
    int left = 0, answer = 1;
    for(int right = 0; right < numbers.size(); right++){
        int number = numbers[right];
        if(numbers_locations.count(number) == 1){
            left = numbers_locations[number];
        }
        answer = max(answer, right - left + 1);
    }        
}

int32_t main(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
}
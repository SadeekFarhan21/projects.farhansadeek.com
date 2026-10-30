#include "bits/stdc++.h"
using namespace std;

int32_t main(){
    int n; cin >> n;
    vector <int> v(n + 1);
    for(int i = 1; i <= n; i++){
        cin >> v[i];
    }
    vector <int> prefix_sum(n + 1, 0);
    prefix_sum[1] = v[1];
    for(int i = 2; i <= n; i++){
        prefix_sum[i] = prefix_sum[i - 1] + v[i];
    }
    int solution = 0;
    for(int l = 1; l <= n; l++){
        for(int r = l; r <= n; r++){
            int sum = prefix_sum[r] - prefix_sum[l - 1];
            int answer = true;
            for(int i = l; i <= r; i++){
                answer &= (sum % v[i] != 0);
            }
            solution += answer;
        }
    }
    cout << solution << '\n';
    return 0;
}
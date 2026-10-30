#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    vector <int> dp(n + 1);
    dp[0] = 0;
    dp[1] = max(dp[0], v[0]);
    for(int i = 2; i <= n; i++){
        dp[i] = max(dp[i - 2] + v[i - 1], dp[i - 1]);
    }
    cout << *max_element(dp.begin(), dp.end()) << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
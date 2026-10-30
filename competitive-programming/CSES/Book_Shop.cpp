#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main(){
    int n, x; cin >> n >> x;
    vector <int> price(n);
    vector <int> pages(n);
    vector <int> dp(x + 1);
    for(int i = 0; i < n; i++){
        cin >> price[i];
    }
    for(int i = 0; i < n; i++){
        cin >> pages[i];
    }

    for(int i = 1; i <= n; i++){
        for(int j = x; j >= price[i - 1]; j--){
            dp[j] = max(dp[j], dp[j - price[i - 1]] + pages[i - 1]);
        }
    }
    cout << dp[x] << "\n";
    return 0;
}
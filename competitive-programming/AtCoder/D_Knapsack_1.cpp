#include "bits/stdc++.h"
using namespace std;
#define double long double
#define int long long


int32_t main(){
    int n, w; cin >> n >> w;
    vector <int> weights(n);
    vector <int> prices(n);
    vector <int> dp(w + 1, 0);
    for(int i = 0; i < n; i++){
        cin >> weights[i];
        cin >> prices[i];
    }

    for(int j = 0; j < n; j++){
        int price = prices[j];
        int weight = weights[j];
        for(int i = w; i >= weight; i--){
            dp[i] = max(dp[i], dp[i - weight] + price);
        }
    }
    cout << dp[w];
}
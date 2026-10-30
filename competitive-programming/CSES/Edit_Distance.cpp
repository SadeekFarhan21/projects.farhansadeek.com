#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main(){
    string a, b; cin >> a >> b;
    int dp[a.size() + 1][b.size() + 1];
    for(int i = 0; i <= a.size(); i++){
        dp[i][0] = i; 
    }
    for(int i = 0; i <= b.size(); i++){
        dp[0][i] = i; 
    }
    for(int i = 1; i <= a.size(); i++){
        for(int j = 1; j <= b.size(); j++){
            if(a[i - 1] == b[j - 1]){
                dp[i][j] = dp[i - 1][j - 1];
            }
            else {
                dp[i][j] = 1 + min({dp[i][j - 1], dp[i - 1][j], dp[i - 1][j - 1]});
            }
        }
    }
    cout << dp[a.size()][b.size()] << "\n";
    return 0;
}
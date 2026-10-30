#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double
int MOD = 1e9 + 7;
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<int> dp(n + 1);
    dp[0] = 1;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= 6; j++) {
            if (i - j >= 0) {
                dp[i] += (dp[i - j] % MOD);
                dp[i] %= MOD;
            }
        }
    }
    cout << dp[n] << "\n";
    return 0;
}
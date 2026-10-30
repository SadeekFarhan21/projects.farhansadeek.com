#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);

    int n;
    cin >> n;
    vector<int> v(n + 1);
    for (int i = 1; i <= n; i++) {
        cin >> v[i];
    }
    vector<vector<int>> dp(n + 1, vector<int>(3, 1e9));
    for (int i = 0; i < 3; i++) {
        dp[0][i] = 0;
    }
    for (int i = 1; i <= n; i++) {
        dp[i][0] = 1 + min({dp[i - 1][0], dp[i - 1][1], dp[i - 1][2]});
        if (v[i] == 1 || v[i] == 3) {
            dp[i][2] = min(dp[i - 1][1], dp[i - 1][0]);
        }
        if (v[i] == 2 || v[i] == 3) {
            dp[i][1] = min(dp[i - 1][0], dp[i - 1][2]);
        }
    }
    cout << min({dp[n][0], dp[n][1], dp[n][2]}) << "\n";
    return 0;
}
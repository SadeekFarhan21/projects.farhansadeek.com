#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    vector<vector<int>> vacation(n, vector<int>(3));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < 3; j++) {
            cin >> vacation[i][j];
        }
    }
    vector<vector<int>> dp(n, vector<int>(3));
    dp[0][0] = vacation[0][0];
    dp[0][1] = vacation[0][1];
    dp[0][2] = vacation[0][2];
    for (int i = 1; i < n; i++) {
        dp[i][0] = max(dp[i - 1][1], dp[i - 1][2]) + vacation[i][0];
        dp[i][1] = max(dp[i - 1][0], dp[i - 1][2]) + vacation[i][1];
        dp[i][2] = max(dp[i - 1][1], dp[i - 1][0]) + vacation[i][2];
    }
    cout << max({dp[n - 1][0], dp[n - 1][1], dp[n - 1][2]}) << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    solve();
}
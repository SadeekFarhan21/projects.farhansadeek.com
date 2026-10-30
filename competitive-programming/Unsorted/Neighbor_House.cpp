#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    vector<vector<int>> grid(n, vector<int>(3));
    vector<vector<int>> dp(n, vector<int>(3, 1e12));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < 3; j++) {
            cin >> grid[i][j];
        }
    }

    dp[0][0] = grid[0][0];
    dp[0][1] = grid[0][1];
    dp[0][2] = grid[0][2];

    for (int i = 1; i < n; i++) {
        dp[i][0] = grid[i][0] + min(dp[i - 1][1], dp[i - 1][2]);
        dp[i][1] = grid[i][1] + min(dp[i - 1][0], dp[i - 1][2]);
        dp[i][2] = grid[i][2] + min(dp[i - 1][0], dp[i - 1][1]);
    }

    cout << *min_element(dp[n - 1].begin(), dp[n - 1].end()) << "\n";
}

int32_t main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        printf("Case %d: ", i + 1);
        solve();
    }
}
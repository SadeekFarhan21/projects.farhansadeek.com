#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double
int MOD = 1e9 + 7;
void solve() {
    int m, n;
    cin >> m >> n;
    vector<vector<char>> grid(m, vector<char>(n));
    vector<vector<int>> dp(m, vector<int>(n, 0));
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            cin >> grid[i][j];
        }
    }

    // first column
    int value = 1;
    for (int i = 0; i < m; i++) {
        if (grid[i][0] == '#') {
            value = 0;
        }
        dp[i][0] = value;
    }

    value = 1;
    for (int i = 0; i < n; i++) {
        if (grid[0][i] == '#') {
            value = 0;
        }
        dp[0][i] = value;
    }

    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            if (grid[i][j] != '#') {
                dp[i][j] = (dp[i - 1][j] % MOD + dp[i][j - 1] % MOD) % MOD;
            }
        }
    }
    cout << dp[m - 1][n - 1] << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    solve();
}
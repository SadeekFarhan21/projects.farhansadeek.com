#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    vector<vector<int>> grid(n, vector<int>(n));
    vector<vector<int>> dp(n, vector<int>(n));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            char c;
            cin >> c;
            grid[i][j] = (c - 'A');
        }
    }
    dp[0][0] = grid[0][0];
    for (int i = 1; i < n; i++) {
        dp[i][0] = dp[i - 1][0] + grid[i][0];
    }
    for (int i = 1; i < n; i++) {
        dp[0][i] = dp[0][i - 1] + grid[0][i];
    }
    for (int i = 1; i < n; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = grid[i][j] + min(dp[i][j - 1], dp[i - 1][j]);
        }
    }
    int i = n - 1, j = n - 1;
    vector<pair<int, int>> path;
    path.push_back({n - 1, n - 1});
    while (i > 0 || j > 0) {
        if (i == 0) {
            j -= 1;
        } else if (j == 0) {
            i -= 1;
        } else {
            if (dp[i - 1][j] < dp[i][j - 1]) {
                i -= 1;
            } else {
                j -= 1;
            }
        }
        path.push_back({i, j});
    }
    reverse(path.begin(), path.end());
    for (int i = 0; i < path.size(); i++) {
        int x = path[i].first;
        int y = path[i].second;
        cout << static_cast<char>(grid[x][y] + 'A');
    }
    
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    solve();
}
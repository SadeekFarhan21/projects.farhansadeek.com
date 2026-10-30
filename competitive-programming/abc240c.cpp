#include <bits/stdc++.h>
using namespace std;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, x;
    cin >> n >> x;
    vector<vector<int>> dp(n + 1, vector<int>(x + 1, 0));
    dp[0][0] = 1;
    for (int i = 1; i <= n; i++) {
        int a, b;
        cin >> a >> b;
        for (int j = 0; j <= x; j++) {
            if (!dp[i - 1][j]) {
                continue;
            }

            if (a + j <= x) {
                dp[i][a + j] = 1;
            }

            if (b + j <= x) {
                dp[i][b + j] = 1;
            }
        }
    }
    if (dp[n][x])
        cout << "Yes\n";
    else
        cout << "No\n";
    return 0;
}
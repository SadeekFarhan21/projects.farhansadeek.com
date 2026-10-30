#include <bits/stdc++.h>
using namespace std;
const int maxn = 2001;
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<vector<int>> dp(n + 1, vector<int>(2001));
    dp[0][0] = 1;
    for (int i = 1; i <= n; i++) {
        int x;
        cin >> x;
        for (int j = 0; j <= 2000; j++) {
            dp[i][j] = dp[i - 1][j];
        }

        for (int j = 2000; j >= x; j--) {
            if (dp[i - 1][j - x]) {
                dp[i][j] = 1;
            }
        }
    }

    for (int i = 0; i <= 1000; i++) {
        if (dp[n][1000 + i]) {
            cout << 1000 + i << '\n';
            break;
        }
        if (dp[n][1000 - i]) {
            cout << 1000 - i << '\n';
            break;
        }
    }
    return 0;
}
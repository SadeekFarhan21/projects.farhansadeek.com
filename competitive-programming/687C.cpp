#include <bits/stdc++.h>
using namespace std;

vector<vector<bool>> dp(501, vector<bool>(501, false));

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    dp[0][0] = true;
    int n, k;
    cin >> n >> k;
    for (int i = 0; i < n; i++) {
        int coin;
        cin >> coin;
        for (int s = k; s >= coin; s--) {
            for (int x = s; x >= 0; x--) {
                bool total = dp[s - coin][x];
                bool both = (x >= coin) ? dp[s - coin][x - coin] : false;
                dp[s][x] = dp[s][x] || total || both;
            }
        }
    }

    vector<int> ans;
    for (int x = 0; x <= k; x++) {
        if (dp[k][x]) {
            ans.push_back(x);
        }
    }
    cout << ans.size() << '\n';
    for (size_t i = 0; i < ans.size(); i++) {
        cout << ans[i] << (i + 1 == ans.size() ? "" : " ");
    }
    cout << '\n';
    return 0;
}
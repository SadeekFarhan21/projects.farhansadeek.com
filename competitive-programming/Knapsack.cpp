#include <bits/stdc++.h>
using namespace std;

bool solve() {
    int c, n;
    if (!(cin >> c >> n)) {
        return false;
    }
    vector<int> value(n);
    vector<int> weight(n);
    for (int i = 0; i < n; i++) {
        cin >> value[i] >> weight[i];
    }
    vector<vector<int>> dp(n + 1, vector<int>(c + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= c; j++) {
            dp[i][j] = dp[i - 1][j];
            if (weight[i - 1] <= j) {
                dp[i][j] = max(dp[i][j], value[i - 1] + dp[i - 1][j - weight[i - 1]]);
            }
        }
    }
    vector<int> chosen;
    int j = c;
    for (int i = n; i >= 1; i--) {
        if (dp[i][j] != dp[i - 1][j]) {
            chosen.push_back(i - 1);
            j -= weight[i - 1];
        }
    }
    reverse(chosen.begin(), chosen.end());
    cout << chosen.size() << '\n';
    for (size_t i = 0; i < chosen.size(); i++) {
        cout << chosen[i] << ' ';
    }
    cout << '\n';
    return true;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    while (solve()) {
    }
    return 0;
}
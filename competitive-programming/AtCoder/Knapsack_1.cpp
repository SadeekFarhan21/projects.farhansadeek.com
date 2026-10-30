#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n, c;
    cin >> n >> c;
    vector<int> w(n), v(n);
    for (int i = 0; i < n; i++) {
        cin >> w[i];
        cin >> v[i];
    }
    vector<int> dp(c + 1, 0);
    for (int i = 0; i < n; i++) {
        for (int j = c; j >= w[i]; j--) {
            dp[j] = max(dp[j], v[i] + dp[j - w[i]]);
        }
    }
    cout << dp[c] << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    solve();
}
#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n, k;
    cin >> n >> k;
    vector<int> v(n);
    vector<int> dp(n, 1e9);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    dp[0] = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 1; j <= k; j++) {
            if (i - j >= 0) {
                dp[i] = min(dp[i], dp[i - j] + abs(v[i] - v[i - j]));
            }
        }
    }
    cout << dp[n - 1] << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    solve();
}
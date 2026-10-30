#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    vector<int> v(n);
    vector<int> dp(n + 1, 0);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
        dp[i + 1] = dp[i] + v[i];
    }

    if (dp[n] % 3 != 0) {
        cout << 0 << "\n";
        return;
    }

    int target = dp[n] / 3;
    int first_cut_count = 0;
    int total_ways = 0;

    for (int i = 1; i < n; i++) {
        if (dp[i] == 2 * target) {
            total_ways += first_cut_count;
        }
        if (dp[i] == target) {
            first_cut_count += 1;
        }
    }
    cout << total_ways << "\n";
    return;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    solve();
    return 0;
}
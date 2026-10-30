#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double
const int MOD = 1e9 + 7;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;
    cin >> n >> m;

    vector<int> x(n);
    for (int i = 0; i < n; i++) {
        cin >> x[i];
    }
    vector<int> dp(m + 2, 0);

    // Initialize base case (index 0)
    if (x[0] == 0) {
        for (int val = 1; val <= m; val++) {
            dp[val] = 1;
        }
    } else {
        dp[x[0]] = 1;
    }

    for (int i = 1; i < n; i++) {
        vector<int> next_dp(m + 2, 0);

        if (x[i] == 0) {
            for (int val = 1; val <= m; val++) {
                next_dp[val] = (dp[val - 1] + dp[val] + dp[val + 1]) % MOD;
            }
        } else {
            int val = x[i];
            next_dp[val] = (dp[val - 1] + dp[val] + dp[val + 1]) % MOD;
        }

        dp = move(next_dp);
    }

    int ans = 0;
    for (int val = 1; val <= m; val++) {
        ans = (ans + dp[val]) % MOD;
    }

    cout << ans << "\n";

    return 0;
}
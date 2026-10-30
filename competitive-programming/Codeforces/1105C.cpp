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
    int n, l, r;
    cin >> n >> l >> r;
    int zero = r / 3 - (l - 1) / 3;
    int one = (r + 2) / 3 - (l + 1) / 3;
    int two = (r + 1) / 3 - l / 3;

    vector<vector<int>> dp(n + 1, vector<int>(3, 0));
    dp[0][0] = 1;

    for (int i = 1; i <= n; i++) {
        dp[i][0] = (dp[i - 1][0] * zero + dp[i - 1][1] * two + dp[i - 1][2] * one) % MOD;
        dp[i][1] = (dp[i - 1][0] * one + dp[i - 1][1] * zero + dp[i - 1][2] * two) % MOD;
        dp[i][2] = (dp[i - 1][0] * two + dp[i - 1][1] * one + dp[i - 1][2] * zero) % MOD;
    }
    cout << dp[n][0] << '\n';
    return 0;
}
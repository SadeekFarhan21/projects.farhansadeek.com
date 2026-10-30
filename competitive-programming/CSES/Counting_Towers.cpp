#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double
int MOD = 1e9 + 7;
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    int MAXN = 1e6 + 1;
    vector<vector<int>> dp(MAXN, vector<int>(2));
    dp[1][0] = 1;
    dp[1][1] = 1;
    for (int i = 2; i <= 1e6; i++) {
        dp[i][0] = (4 * dp[i - 1][0] % MOD + dp[i - 1][1] % MOD) % MOD;
        dp[i][1] = (dp[i - 1][0] % MOD + 2 * dp[i - 1][1] % MOD) % MOD;
    }
    while (t--) {
        int a;
        cin >> a;
        cout << (dp[a][0] % MOD + dp[a][1] % MOD) % MOD << '\n';
    }
    return 0;
}
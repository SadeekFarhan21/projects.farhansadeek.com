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
    int n;
    cin >> n;

    int total = (n * (n + 1)) / 2;
    if (total & 1) {
        cout << "0\n";
    } else {
        int target = total / 2;
        vector<int> dp(total + 1, 0);
        dp[0] = 1;
        for (int i = 1; i < n; i++) {
            for (int j = target; j >= i; j--) {
                dp[j] = (dp[j] + dp[j - i]) % MOD;
            }
        }
        cout << dp[target] << '\n';
    }
    return 0;
}
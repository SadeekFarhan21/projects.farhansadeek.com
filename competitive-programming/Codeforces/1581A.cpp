#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double
int MOD = 1e9 + 7;
void solve() {
    int n;
    cin >> n;
    int answer = 1;
    for (int i = 3; i <= 2 * n; i++) {
        answer = ((answer % MOD) * (i % MOD)) % MOD;
    }
    cout << answer << '\n';
    return;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    while (t--) {
        solve();
    }
    return 0;
}
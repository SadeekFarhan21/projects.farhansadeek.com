#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<int> v(n);
    int max_sum = 0;
    for (int i = 0; i < n; i++) {
        cin >> v[i];
        max_sum += v[i];
    }
    vector<bool> dp(max_sum + 1, false);
    dp[0] = true;
    for (int i = 0; i < n; i++) {
        for (int s = max_sum; s >= v[i]; s--) {
            if (dp[s - v[i]]) {
                dp[s] = true;
            }
        }
    }
    vector<int> possible_sums;
    for (int i = 1; i <= max_sum + 1; i++) {
        if (dp[i]) {
            possible_sums.push_back(i);
        }
    }
    cout << possible_sums.size() << '\n';
    for (auto x : possible_sums)
        cout << x << ' ';
    cout << '\n';
    return 0;
}
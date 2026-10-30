#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    vector<int> v(n);
    int zero = 0, one = 0;
    for (int i = 0; i < n; i++) {
        cin >> v[i];
        zero += v[i] == 0;
        one += v[i] == 1;
    }
    // if there are no ones it's impossible
    if (one == 0) {
        cout << 0 << '\n';
        return;
    }
    // if there are ones then it's a different case
    // so if it's a 0 it doesn't impact the outcome so you have the option to take and not take 0 so we have 2^{#0} choices to keep it the
    // same
    int answer = one;
    for (int i = 0; i < zero; i++) {
        answer *= 2;
    }

    cout << answer << '\n';
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
}
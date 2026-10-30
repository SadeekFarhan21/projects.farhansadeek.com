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
    map<int, int> m;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        m[x]++;
    }

    vector<pair<int, int>> v(m.begin(), m.end());

    if (v.empty() || v[0].first != 1) {
        cout << 0 << '\n';
        return;
    }

    int answer = 0;
    int current = 1;
    for (int i = 0; i < (int)v.size(); i++) {
        if (i > 0 && v[i].first != v[i - 1].first + 1) {
            break;
        }

        current = (current * (v[i].second % MOD)) % MOD;
        answer = (answer + current) % MOD;
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
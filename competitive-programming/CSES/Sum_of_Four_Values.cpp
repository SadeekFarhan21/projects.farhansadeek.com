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
    int n, x;
    cin >> n >> x;
    vector<pair<int, int>> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i].first;
        v[i].second = i + 1;
    }
    gp_hash_table<int, pair<int, int>> m;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int target = x - v[i].first - v[j].first;
            if (m.find(target) != m.end()) {
                cout << m[target].first << ' ' << m[target].second << ' ' << v[i].second << ' ' << v[j].second << '\n';
                return 0;
            }
        }

        for (int k = 0; k < i; k++) {
            m[v[k].first + v[i].first] = {v[k].second, v[i].second};
        }
    }
    cout << "IMPOSSIBLE\n";
    return 0;
}
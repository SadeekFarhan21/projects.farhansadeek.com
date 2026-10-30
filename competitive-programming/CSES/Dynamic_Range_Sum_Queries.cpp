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

    int n, q;
    cin >> n >> q;
    vector<int> v(n + 1);

    vector<int> tree(n + 1, 0);
    auto add = [&](int i, int delta) {
        for (; i <= n; i += i & -i) {
            tree[i] += delta;
        }
    };

    auto query = [&](int i) -> int {
        int sum = 0;
        for (; i > 0; i -= i & -i) {
            sum += tree[i];
        }
        return sum;
    };

    for (int i = 1; i <= n; i++) {
        cin >> v[i];
        add(i, v[i]);
    }

    for (int i = 0; i < q; i++) {
        int t;
        cin >> t;
        if (t == 1) {
            int k, u;
            cin >> k >> u;
            int delta = u - v[k];
            v[k] = u;
            add(k, delta);
        } else {
            int a, b;
            cin >> a >> b;
            cout << query(b) - query(a - 1) << "\n";
        }
    }
    return 0;
}
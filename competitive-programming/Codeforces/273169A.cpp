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
    vector<int> tree(n + 1);
    auto add = [&](int i, int delta) {
        for (; i <= n; i += i & -i) {
            tree[i] += delta;
        }
    };

    auto query = [&](int i) {
        int sum = 0;
        for (; i > 0; i -= i & -i) {
            sum += tree[i];
        }
        return sum;
    };
    vector<int> a(n + 1);
    for (int i = 1; i <= n; i++) {
        cin >> a[i];
        add(i, a[i]);
    }

    while (q--) {
        int t;
        cin >> t;
        if (t == 1) {
            int i, v;
            cin >> i >> v;
            i++;
            int delta = v - a[i];
            a[i] = v;
            add(i, delta);
        } else {
            int l, r;
            cin >> l >> r;
            cout << query(r) - query(l) << "\n";
        }
    }
}
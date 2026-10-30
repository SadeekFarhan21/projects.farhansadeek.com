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
        int val;
        cin >> val;
        add(i, val);
        add(i + 1, -val);
    }

    for (int i = 0; i < q; i++) {
        int t;
        cin >> t;
        if (t == 1) {
            int a, b, u;
            cin >> a >> b >> u;
            add(a, u);
            add(b + 1, -u);
        } else {
            int k;
            cin >> k;
            cout << query(k) << "\n";
        }
    }
    return 0;
}
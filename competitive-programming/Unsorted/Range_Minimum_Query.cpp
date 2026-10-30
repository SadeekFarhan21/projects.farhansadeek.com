#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;
template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);

    // reading the input
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }

    // building the sparse table
    int K = __lg(n) + 1;
    vector<vector<int>> st(K, vector<int>(n));
    for (int i = 0; i < n; i++) {
        st[0][i] = v[i];
    }

    for (int j = 1; j < K; j++) {
        for (int i = 0; i + (1 << j) <= n; i++) {
            st[j][i] = min(st[j - 1][i], st[j - 1][i + (1 << (j - 1))]);
        }
    }

    auto query = [&](int l, int r) -> int {
        int len = r - l + 1;
        int k = __lg(len);
        return min(st[k][l], st[k][r - (1 << k) + 1]);
    };

    int q;
    cin >> q;
    for (int i = 0; i < q; i++) {
        int a, b;
        cin >> a >> b;
        cout << query(a, b) << "\n";
    }
    return 0;
}
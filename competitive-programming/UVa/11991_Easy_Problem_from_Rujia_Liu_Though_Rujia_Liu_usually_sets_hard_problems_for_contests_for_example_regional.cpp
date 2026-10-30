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
    int n, m;
    while (cin >> n >> m) {
        map<int, vector<int>> occurences;
        vector<int> a(n);
        for (int i = 0; i < n; i++) {
            cin >> a[i];
            occurences[a[i]].push_back(i + 1);
        }

        for (int i = 0; i < m; i++) {
            int k, v;
            cin >> k >> v;
            if (k > occurences[v].size()) {
                cout << 0 << '\n';
            } else {
                cout << occurences[v][k - 1] << '\n';
            }
        }
    }
    return 0;
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

void solve(int n, int m) {
    map<int, int> freq;
    for (int i = 0; i < n; i++) {
        int a;
        cin >> a;
        freq[a]++;
    }
    vector<int> poly(n + 1, 0);
    poly[0] = 1;
    for (auto &[label, f] : freq) {
        vector<int> next_poly(n + 1, 0);
        for (int i = 0; i <= n; i++) {
            if (poly[i] == 0)
                continue;
            for (int k = 0; k <= f && i + k <= n; k++) {
                next_poly[i + k] += poly[i];
            }
        }
        poly = next_poly;
    }
    for (int i = 0; i < m; i++) {
        int r;
        cin >> r;
        if (r >= 0 && r <= n) {
            cout << poly[r] << '\n';
        } else {
            cout << 0 << '\n';
        }
    }
}

int32_t main() {
    int n, m;
    int t = 1;
    while (cin >> n >> m && n != 0 && m != 0) {
        printf("Case %lld:\n", t);
        t += 1;
        solve(n, m);
    }
    return 0;
}
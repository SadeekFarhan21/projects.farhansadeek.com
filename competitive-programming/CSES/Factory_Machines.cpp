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
    int n, t;
    cin >> n >> t;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    auto possible = [&](int time) {
        int products = 0;
        for (int i = 0; i < n; i++) {
            products += (time / v[i]);
            if (products >= t)
                return true;
        }
        return false;
    };

    int l = 0, h = *min_element(v.begin(), v.end()) * t;
    while (l < h) {
        int m = l + (h - l) / 2;
        if (possible(m)) {
            h = m;
        } else {
            l = m + 1;
        }
    }
    cout << h << '\n';
}
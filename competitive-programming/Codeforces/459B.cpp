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
    int n;
    cin >> n;
    vector<int> v(n);
    map<int, int> m;
    int low = LLONG_MAX;
    int high = LLONG_MIN;
    for (int i = 0; i < n; i++) {
        cin >> v[i];
        m[v[i]]++;
        low = min(low, v[i]);
        high = max(high, v[i]);
    }
    if (low == high) {
        cout << 0 << " " << (n * (n - 1)) / 2 << '\n';
        return 0;
    }
    cout << high - low << " " << m[low] * m[high] << '\n';
    return 0;
}
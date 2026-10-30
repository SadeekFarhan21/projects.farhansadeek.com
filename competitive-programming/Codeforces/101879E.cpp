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
    vector<int> v(31);
    v[0] = 1;
    for (int i = 1; i <= 30; i++) {
        v[i] = v[i - 1] * 2;
    }
    if (n == 2) {
        cout << 1 << '\n';
        return 0;
    }
    cout << v[n] - n - 1 << '\n';
    return 0;
}
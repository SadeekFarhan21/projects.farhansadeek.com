#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;
typedef tree<pair<int, int>, null_type, less<pair<int, int>>, rb_tree_tag,
             tree_order_statistics_node_update>
    ordered_multiset;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);

    int n, k;
    cin >> n >> k;
    ordered_multiset ms;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }

    // first k elements
    for (int i = 0; i < k; i++) {
        ms.insert({v[i], i});
    }
    cout << ms.find_by_order((k - 1) / 2)->first << " ";
    for (int i = k; i < n; i++) {
        ms.erase({v[i - k], i - k});
        ms.insert({v[i], i});
        cout << ms.find_by_order((k - 1) / 2)->first << " ";
    }
    return 0;
}
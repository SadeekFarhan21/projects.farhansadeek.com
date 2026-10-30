#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, k;
    cin >> n >> k;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    int sell = v[0] * 100;
    int profit = 0;
    for (int i = 0; i < n; i++) {
        sell = max(sell, 100 * v[i] + k * i);
        profit = max(profit, sell - (100 * v[i] + k * (i + 1)));
    }
    cout << profit << '\n';
    return 0;
}
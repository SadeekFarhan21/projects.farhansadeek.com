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
    vector<int> v(56);
    vector<int> s(56);
    v[0] = 1;
    s[0] = 0;
    for (int i = 1; i <= 55; i++) {
        v[i] = v[i - 1] * 2;
        s[i] = s[i - 1] + v[i];
    }
    int n;
    cin >> n;
    cout << s[n] << '\n';
    return 0;
}
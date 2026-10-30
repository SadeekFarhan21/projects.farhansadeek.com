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
    ordered_set<int> children;
    for (int i = 0; i < n; i++) {
        children.insert(i + 1);
    }
    int idx = 0;
    while (!children.empty()) {
        idx = (idx + 1) % children.size();
        auto it = children.find_by_order(idx);
        cout << *it << ' ';
        children.erase(it);
    }
}
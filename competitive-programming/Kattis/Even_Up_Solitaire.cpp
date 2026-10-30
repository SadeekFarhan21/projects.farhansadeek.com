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
    for (int i = 0; i < n; i++) {
        int a;
        cin >> a;
        v[i] = a % 2;
    }
    stack<int> st;
    for (int i = 0; i < n; i++) {
        int x = v[i];
        if (!st.empty()) {
            int y = st.top();
            if (x == y) {
                st.pop();
            } else {
                st.push(x);
            }
        } else {
            st.push(v[i]);
        }
    }
    cout << st.size() << '\n';
    return 0;
}
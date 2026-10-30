#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

void solve(int n) {
    int answer = 0;
    int x_max = (n - 6) / 3;
    for (int i = 0; i <= x_max; i++) {
        int y_max = (n - 6 - 3 * i) / 2;
        answer += (y_max + 1);
    }
    cout << answer << '\n';
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    int t = 0;
    while (cin >> n && n != 0) {
        cout << "Case " << t + 1 << ": ";
        solve(n);
        t += 1;
    }
    return 0;
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

void solve() {}

int32_t main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    bool first_case = true;

    while (cin >> n && n != 0) {
        if (!first_case) {
            cout << "\n";
        }
        first_case = false;

        int pile1 = 0, pile2 = 0;

        for (int i = 0; i < n; ++i) {
            string op;
            int m;
            cin >> op >> m;

            
        }
    }
}
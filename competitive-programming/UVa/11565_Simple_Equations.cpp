#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

void solve() {
    int a, b, c;
    cin >> a >> b >> c;

    for (int x = -100; x <= 100; x++) {
        if (x * x > c)
            continue;
        for (int y = -100; y <= 100; y++) {
            if (x == y || x * x + y * y > c)
                continue;

            int z = a - x - y;
            if (x != z && y != z && (x * y * z == b) && (x * x + y * y + z * z == c)) {
                cout << x << ' ' << y << ' ' << z << '\n';
                return;
            }
        }
    }
    cout << "No solution.\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
}
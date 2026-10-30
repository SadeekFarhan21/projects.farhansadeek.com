#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n, k, l;
    cin >> n >> k >> l;
    if (k < 0) {
        k = 0;
    }
    int winner = INT_MIN;
    for (int i = 0; i < n - 1; i++) {
        int a;
        cin >> a;
        winner = max(a, winner);
    }
    int f;
    cin >> f;
    if (f > winner) {
        cout << "Yes\n";
        return;
    }

    f += k;
    if (f > winner && k <= l) {
        cout << "Yes\n";
        return;
    }
    cout << winner << " " << f << " " << l << "\n";
    cout << "No\n";
    return;
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
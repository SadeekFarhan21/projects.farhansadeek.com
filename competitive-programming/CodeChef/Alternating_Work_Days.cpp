#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int a, b, p, q;
    cin >> a >> b >> p >> q;
    int time1 = p / a;
    int time2 = q / b;
    if (abs(time1 - time2) <= 1 && p % a == 0 && q % b == 0) {
        cout << "YES" << "\n";
    } else {
        cout << "NO" << "\n";
    }
}

int32_t main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
}
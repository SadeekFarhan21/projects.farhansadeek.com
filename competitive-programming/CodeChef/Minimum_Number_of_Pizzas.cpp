#include <bits/stdc++.h>
#include <numeric>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n, k;
    cin >> n >> k;
    cout << n / gcd(n, k) << "\n";
}

int32_t main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
}
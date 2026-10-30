//! https://www.codechef.com/practice/course/3-star-difficulty-problems/DIFF1700/problems/ODDSUM
#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    if (n == 1 || n == 2) {
        cout << 1 << "\n";
        return;
    }
    n -= 2;
    cout << 1 + n * (n + 1) << "\n";
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
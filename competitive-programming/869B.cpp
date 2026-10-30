#include <bits/stdc++.h>
using namespace std;

#define int long long
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int a, b;
    cin >> a >> b;
    if (a == b) {
        cout << 1 << '\n';
        return 0;
    } else if (b - a >= 5) {
        cout << 0 << '\n';
        return 0;
    } else {
        int product = (a + 1) % 10;
        for (int i = a + 2; i <= b; i++) {
            product *= (i % 10);
        }
        cout << product % 10 << '\n';
    }
    return 0;
}
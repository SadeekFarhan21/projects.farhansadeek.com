#include <bits/stdc++.h>
using namespace std;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    while (t--) {
        int a, b;
        cin >> a >> b;
        a = abs(a), b = abs(b);
        if (a == b) {
            cout << a * 2 << '\n';

        } else {
            int diag = min(a, b);
            cout << diag * 2 + (a - diag) * 2 + (b - diag) * 2 - 1 << '\n';
        }
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

void solve() {
    long long x, y, n; cin >> x >> y >> n;
    x %= n;
    long long answer = 1;

    while (y > 0) {
        if (y & 1)
            answer = (answer * x) % n;

        y >>= 1;
        x = (x * x) % n;
    }

    cout << answer % n << "\n";
}

int main() {
    int t; cin >> t;
    for(int i = 0; i < t; i++) {
        solve();
    }

    return 0;
}
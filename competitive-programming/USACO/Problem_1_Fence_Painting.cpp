#include <bits/stdc++.h>
using namespace std;

int main() {
    freopen("paint.in", "r", stdin);
    freopen("paint.out", "w", stdout);

    int a, b, c, d;
    cin >> a >> b >> c >> d;

    if (c <= b && a <= d) {
        cout << max(b, d) - min(a, c) << "\n";
    } else {
        cout << (b - a + 1) + (d - c + 1) << "\n";
    }

    return 0;
}

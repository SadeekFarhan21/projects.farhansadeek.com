#include <bits/stdc++.h>
using namespace std;
#define int long long

int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

void solve() {
    int a, b;
    cin >> a >> b;
    if (a > b)
        swap(a, b);
    int g = gcd(a, b);
    //! nothing is necessary
    if (g != 1) {
        cout << 0 << "\n";
    } //! only one way from making it
    else if (b % a == a - 1) {
        cout << 1 << "\n";
    }
    //! check parity nw
    else {
        a %= 2;
        b %= 2;
        cout << a + b << "\n";
    }
}

int32_t main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
}
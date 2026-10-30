#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    double x, y;
    cin >> x >> y;
    double a = pow(x, 1 / x);
    double b = pow(y, 1 / y);
    if (a < b)
        cout << "<\n";
    else if (a > b)
        cout << ">\n";
    else
        cout << "=\n";
    return 0;
}
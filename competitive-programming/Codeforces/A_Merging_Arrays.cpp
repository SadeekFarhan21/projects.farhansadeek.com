#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int m, n;
    cin >> m >> n;
    vector<int> a(m);
    vector<int> b(n);
    for (int i = 0; i < m; i++) {
        cin >> a[i];
    }
    for (int i = 0; i < n; i++) {
        cin >> b[i];
    }
    int x = 0, y = 0;
    while (x < m && y < n) {
        if (a[x] <= b[y]) {
            cout << a[x] << " ";
            x += 1;
        } else {
            cout << b[y] << " ";
            y += 1;
        }
    }
    while (x < m) {
        cout << a[x] << " ";
        x++;
    }
    while (y < n) {
        cout << b[y] << " ";
        y++;
    }
    return 0;
}
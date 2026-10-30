#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    int largest = v[n - 1];
    int smallest = v[0];
    if (largest == smallest) {
        cout << "NO\n";
    } else {
        cout << "YES" << "\n" << largest << " " << smallest << " ";
        for (int i = 1; i < n - 1; i++) {
            cout << v[i] << " ";
        }
        cout << "\n";
    }
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
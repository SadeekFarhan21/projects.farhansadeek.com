#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    vector<int> a(n);

    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    sort(a.begin(), a.end());
    multiset<int> b;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        b.insert(x);
    }

    while (!b.empty()) {
        cout << *b.begin() << " ";
        b.erase(b.begin());
    }
    cout << "\n";
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
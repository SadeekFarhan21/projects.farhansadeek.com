#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    int n;
    cin >> n;
    map<int, int> m;
    for (int i = 0; i < n; i++) {
        int a;
        cin >> a;
        m[a]++;
    }
    for (auto x : m)
        cout << x.first << " " << x.second << "\n";
}
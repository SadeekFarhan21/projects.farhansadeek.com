#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

void solve() {
    int s;
    cin >> s;
    vector<int> dp(s - 1);
    vector<int> start(s - 1);
    vector<int> niceness(s - 1);
    for (int i = 0; i < s - 1; i++) {
        cin >> start[i];
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
    return 0;
}
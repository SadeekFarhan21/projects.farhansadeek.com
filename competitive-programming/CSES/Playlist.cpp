#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    map<int, int> m; // {number, index}
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    int answer = 0;
    int l = 0;
    for (int r = 0; r < n; r++) {
        if (m.count(v[r])) {
            l = max(l, m[v[r]] + 1);
        }
        m[v[r]] = r;
        answer = max(answer, r - l + 1);
    }
    cout << answer << "\n";
}
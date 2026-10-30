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
    
    int n;
    bool first = true;
    
    while (cin >> n && n != 0) {
        if (!first) {
            cout << '\n';
        }
        first = false;

        vector<int> v(n);
        for (int i = 0; i < n; i++) {
            cin >> v[i];
        }
        
        for (int a = 0; a < n - 5; a++) {
            for (int b = a + 1; b < n - 4; b++) {
                for (int c = b + 1; c < n - 3; c++) {
                    for (int d = c + 1; d < n - 2; d++) {
                        for (int e = d + 1; e < n - 1; e++) {
                            for (int f = e + 1; f < n; f++) {
                                cout << v[a] << ' ' << v[b] << ' ' << v[c] << ' ' << v[d] << ' ' << v[e] << ' ' << v[f] << '\n';
                            }
                        }
                    }
                }
            }
        }
    }
    return 0;
}
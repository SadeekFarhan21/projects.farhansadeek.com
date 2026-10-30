#include <algorithm>
#include <bits/stdc++.h>
using namespace std;

void solve() {
    
        int n;
        cin >> n;
        vector<int> h(n);
        for (int i = 0; i < n; i++) {
            cin >> h[i];
        }
        vector<int> m(n);
        for (int i = 0; i < n; i++) {
            cin >> m[i];
        }

        vector<int> lis(n, 1);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (h[j] < h[i] && m[j] > m[i]) {
                    lis[i] = max(lis[i], lis[j] + 1);
                }
            }
        }
        cout << *max_element(lis.begin(), lis.end()) << "\n";
}


int32_t main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
    return 0;
}
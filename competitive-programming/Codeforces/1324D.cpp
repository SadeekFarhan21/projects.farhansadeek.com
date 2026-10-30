#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<int> a(n), b(n), c(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    for (int i = 0; i < n; i++) {
        cin >> b[i];
    }
    for (int i = 0; i < n; i++) {
        c[i] = a[i] - b[i];
    }
    sort(c.begin(), c.end());
    int l = 0, r = n - 1;
    int count = 0;
    while (l < r) {
        if (c[l] + c[r] > 0) {
            count += (r - l);
            r--;
        } else {
            l++;
        }
    }
    cout << count << "\n";
    return 0;
}
#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main() {
    int n, x;
    cin >> n >> x;
    vector<ll> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    vector<ll> dp(x + 1, 1e12);
    dp[0] = 0;
    for (int i = 1; i <= x; i++) {
        for (int j = 0; j < n; j++) {
            if (i - v[j] >= 0) {
                dp[i] = min(dp[i], 1 + dp[i - v[j]]);
            }
        }
    }
    if (dp[x] == 1e12)
        cout << -1;
    else
        cout << dp[x];
    cout << "\n";
    return 0;
}
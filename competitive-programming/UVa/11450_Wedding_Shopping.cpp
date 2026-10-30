#include <bits/stdc++.h>
using namespace std;

void solve() {
    int m, c;
    cin >> m >> c;

    vector<bool> dp(m + 1, false);
    dp[0] = true;

    for (int group = 0; group < c; group++) {
        int n;
        cin >> n;

        vector<int> a(n);
        for (int &x : a) {
            cin >> x;
        }

        vector<bool> next(m + 1, false);

        for (int sum = 0; sum <= m; sum++) {
            if (!dp[sum]) continue;

            for (int price : a) {
                if (sum + price <= m) {
                    next[sum + price] = true;
                }
            }
        }

        dp = next;
    }

    cout << (dp[m] ? "yes\n" : "no\n");
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;

    while (t--) {
        solve();
    }
}
#include <bits/stdc++.h>
using namespace std;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    int total = accumulate(v.begin(), v.end(), 0LL);
    vector<int> dp(total + 1, false);
    dp[0] = true;
    for (int i = 0; i < n; i++) {
        for (int j = total; j >= v[i]; j--) {
            if (dp[j - v[i]]) {
                dp[j] = true;
            }
        }
    }
    int target = (total + 1) / 2;
    for (int i = target; i <= total; i++) {
        if (dp[i]) {
            cout << i << '\n';
            return 0;
        }
    }
    return 0;
}
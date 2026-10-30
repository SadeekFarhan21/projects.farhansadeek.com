#include <bits/stdc++.h>
using namespace std;

int solve_linear(const vector<int> &v, int l, int r) {
    int len = r - l + 1;
    if (len <= 0)
        return 0;
    if (len == 1)
        return v[l];

    vector<int> dp(len);
    dp[0] = v[l];
    dp[1] = max(v[l], v[l + 1]);

    for (int i = 2; i < len; i++) {
        dp[i] = max(dp[i - 1], dp[i - 2] + v[l + i]);
    }

    return dp[len - 1];
}

int solve() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
        cin >> v[i];

    if (n == 1)
        return v[0];

    int option1 = solve_linear(v, 0, n - 2);
    int option2 = solve_linear(v, 1, n - 1);

    return max(option1, option2);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    for (int i = 1; i <= t; i++) {
        cout << "Case " << i << ": " << solve() << "\n";
    }
    return 0;
}
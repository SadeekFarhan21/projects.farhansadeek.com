#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);

    int n, m;
    cin >> n >> m;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }

    int K = __lg(n) + 1;
    vector<vector<int>> dp(K, vector<int>(n));
    for (int i = 0; i < n; i++) {
        dp[0][i] = v[i];
    }

    for (int j = 1; j < K; j++) {
        for (int i = 0; i + (1 << j) <= n; i++) {
            dp[j][i] = max(dp[j - 1][i], dp[j - 1][i + (1 << (j - 1))]);
        }
    }

    auto query = [&](int a, int b) -> int {
        if (abs(a - b) <= 1) {
            return 1;
        } else if (a > b) {
            int l = b + 1;
            int r = a;
            int len = r - l + 1;
            int k = __lg(len);
            return max(dp[k][l], dp[k][r - (1 << k) + 1]) == v[a];
        } else {
            int l = a;
            int r = b - 1;
            int len = r - l + 1;
            int k = __lg(len);
            return max(dp[k][l], dp[k][r - (1 << k) + 1]) == v[a];
        }
    };

    int answer = 0;
    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        answer += query(a - 1, b - 1);
    }

    cout << answer << "\n";
    return 0;
}
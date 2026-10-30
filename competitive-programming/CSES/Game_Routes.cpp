#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double
int MOD = 1e9 + 7;
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, e;
    cin >> n >> e;
    vector<vector<int>> adj_list(n + 1);
    vector<int> dp(n + 1, 0);
    dp[1] = 1;
    vector<int> in_degree(n + 1, 0);
    for (int i = 0; i < e; i++) {
        int u, v;
        cin >> u >> v;
        adj_list[u].push_back(v);
        in_degree[v] += 1;
    }

    queue<int> q;
    for (int i = 1; i <= n; i++) {
        if (in_degree[i] == 0) {
            q.push(i);
        }
    }

    while (!q.empty()) {
        int node = q.front();
        q.pop();
        for (auto neighbor : adj_list[node]) {
            dp[neighbor] = (dp[neighbor] % MOD + dp[node] % MOD) % MOD;
            in_degree[neighbor] -= 1;
            if (in_degree[neighbor] == 0) {
                q.push(neighbor);
            }
        }
    }
    cout << dp[n] << "\n";
    return 0;
}
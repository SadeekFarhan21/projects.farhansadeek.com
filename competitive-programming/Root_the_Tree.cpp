#include <bits/stdc++.h>
using namespace std;

void dfs(int node, vector<bool> &visited, vector<vector<int>> &adj) {
    visited[node] = true;
    for (int neighbor : adj[node]) {
        if (!visited[neighbor]) {
            dfs(neighbor, visited, adj);
        }
    }
}

void solve() {
    int n;
    cin >> n;
    vector<vector<int>> adj(n, vector<int>());
    vector<int> in_degree(n, 0);
    for (int i = 0; i < n - 1; i++) {
        int a, b;
        cin >> a >> b;
        a--;
        b--;
        in_degree[b]++;
    }
    int answer = 0;
    for (int i = 0; i < n; i++) {
        answer += max(0, in_degree[i] - 1);
    }
    cout << answer << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    while (t--) {
        solve();
    }
    return 0;
}
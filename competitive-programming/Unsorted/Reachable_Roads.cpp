#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

void dfs(int node, vector<int> &visited, vector<vector<int>> &adj) {
    visited[node] = 1;
    for (int neighbor : adj[node]) {
        if (!visited[neighbor]) {
            dfs(neighbor, visited, adj);
        }
    }
}

void solve() {
    int m, r;
    cin >> m >> r;
    vector<int> visited(m, 0);
    vector<vector<int>> adj(m, vector<int>());
    for (int i = 0; i < r; i++) {
        int a, b;
        cin >> a >> b;
        adj[a].push_back(b);
        adj[b].push_back(a);
    }

    int count = -1;
    for (int i = 0; i < m; i++) {
        if (!visited[i]) {
            dfs(i, visited, adj);
            count += 1;
        }
    }
    cout << count << '\n';
    return;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
    return 0;
}
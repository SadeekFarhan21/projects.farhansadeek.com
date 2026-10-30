#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int dfs(int node, vector<int> &visited, vector<vector<int>> &adj) {
    visited[node] = 1;
    int size = 1;
    for (int neighbor : adj[node]) {
        if (!visited[neighbor]) {
            size += dfs(neighbor, visited, adj);
        }
    }
    return size;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;
    while (cin >> n >> m && (n != 0 || m != 0)) {
        vector<int> visited(n, 0);
        vector<tuple<int, int, int>> edges;
        edges.reserve(m);
        int max_weight = INT_MIN;
        for (int i = 0; i < m; i++) {
            int a, b, w;
            cin >> a >> b >> w;
            a--, b--;
            edges.push_back({a, b, w});
            max_weight = max(max_weight, w);
        }
        int answer = 0;
        vector<vector<int>> adj(n);
        for (auto [a, b, w] : edges) {
            if (w == max_weight) {
                adj[a].push_back(b);
                adj[b].push_back(a);
            }
        }
        int current = 0;
        for (int i = 0; i < n; i++) {
            if (!visited[i]) {
                current = dfs(i, visited, adj);
                answer = max(answer, current);
            }
        }
        cout << answer << '\n';
    }
    return 0;
}
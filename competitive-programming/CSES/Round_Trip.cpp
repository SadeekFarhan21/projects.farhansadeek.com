#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

bool dfs(int node, int parent, vector<bool> &visited,
         vector<vector<int>> &adj_list) {

    visited[node] = true;
    for (auto neighbor : adj_list[node]) {
        if (neighbor == parent) {
            continue;
        }
        if (visited[neighbor]) {
            return true;
        }
        if (dfs(neighbor, node, visited, adj_list)) {
            return true;
        }
    }
    return false;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int node, edges;
    cin >> node >> edges;
    vector<vector<int>> adj_list(node + 1);
    for (int i = 0; i < edges; i++) {
        int u, v;
        cin >> u >> v;
        adj_list[u].push_back(v);
        adj_list[v].push_back(u);
    }
    
}
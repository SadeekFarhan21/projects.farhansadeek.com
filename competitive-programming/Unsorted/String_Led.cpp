#include <bits/stdc++.h>
using namespace std;

void dfs(int node, vector<bool>& visited, const vector<vector<int>>& adj) {
    visited[node] = true;
    for (int neighbor : adj[node]) {
        if (!visited[neighbor])
            dfs(neighbor, visited, adj);
    }
}

int main() {
    int n, e;
    cin >> n >> e;

    vector<bool> visited(n, false);
    vector<vector<int>> adj(n);

    for (int i = 0; i < e; i++) {
        int a, b;
        cin >> a >> b;
        a--; b--;                 // convert to 0-indexed
        adj[a].push_back(b);
        adj[b].push_back(a);
    }

    int components = 0;
    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            components++;
            dfs(i, visited, adj);
        }
    }

    cout << (components == 1 ? "COMPLETO\n" : "INCOMPLETO\n");
    return 0;
}
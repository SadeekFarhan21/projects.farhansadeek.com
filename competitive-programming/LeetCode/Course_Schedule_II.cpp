#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int nodes, edges;
    cin >> nodes >> edges;
    vector<vector<int>> adj(nodes + 1);
    vector<int> in_degrees(nodes + 1);
    for (int i = 0; i < edges; i++) {
        int u, v;
        cin >> u >> v;
        adj[v].push_back(u);
        in_degrees[u] += 1;
    }

    priority_queue<int> pq;
    vector<int> path;
    for (int i = 1; i <= nodes; i++) {
        if (in_degrees[i] == 0) {
            pq.push(i);
        }
    }

    while (!pq.empty()) {
        int node = pq.top();
        pq.pop();
        path.push_back(node);
        for (auto neighbor : adj[node]) {
            in_degrees[neighbor] -= 1;
            if (in_degrees[neighbor] == 0) {
                pq.push(neighbor);
            }
        }
    }
    for (int i = path.size() - 1; i >= 0; i--) {
        cout << path[i] << " ";
    }
    return 0;
}
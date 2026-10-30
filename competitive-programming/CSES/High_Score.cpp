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

    vector<tuple<int, int, int>> edge_list;
    vector<vector<int>> reverse_graph(nodes + 1);
    edge_list.reserve(edges);

    for (int i = 0; i < edges; i++) {
        int a, b, c;
        cin >> a >> b >> c;
        edge_list.push_back({a, b, c});
        reverse_graph[b].push_back(a);
    }

    vector<bool> can_reach_target(nodes + 1, false);
    queue<int> q;
    q.push(nodes);
    can_reach_target[nodes] = true;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        for (int prev : reverse_graph[node]) {
            if (!can_reach_target[prev]) {
                can_reach_target[prev] = true;
                q.push(prev);
            }
        }
    }

    const int NEG_INF = numeric_limits<int>::min() / 4;
    vector<int> dist(nodes + 1, NEG_INF);
    dist[1] = 0;

    for (int i = 1; i < nodes; i++) {
        for (const auto &[u, v, w] : edge_list) {
            if (dist[u] != NEG_INF && dist[u] + w > dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }

    for (const auto &[u, v, w] : edge_list) {
        if (dist[u] != NEG_INF && dist[u] + w > dist[v] && can_reach_target[v]) {
            cout << "-1\n";
            return 0;
        }
    }

    cout << dist[nodes] << "\n";
    return 0;
}

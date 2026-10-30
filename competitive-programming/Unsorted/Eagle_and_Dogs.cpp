#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

pair<int, vector<int>> bfs(int start, int n, const vector<vector<pair<int, int>>> &adj) {
    vector<int> dist(n + 1, -1);
    queue<int> q;
    q.push(start);
    dist[start] = 0;
    int farthest_node = start;
    int max_dist = 0;
    while (!q.empty()) {
        int node = q.front();
        q.pop();

        if (dist[node] > max_dist) {
            farthest_node = node;
            max_dist = dist[node];
        }

        for (auto &[neighbor, weight] : adj[node]) {
            if (dist[neighbor] == -1) {
                dist[neighbor] = dist[node] + weight;
                q.push(neighbor);
            }
        }
    }
    return {farthest_node, dist};
}

void solve() {
    int n;
    cin >> n;
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < n - 1; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});
        adj[v].push_back({u, w});
    }
    auto [a, unused_distance] = bfs(1, n, adj);
    auto [b, dist1] = bfs(a, n, adj);
    auto [unused_node, dist2] = bfs(b, n, adj);
    for (int i = 1; i <= n; i++) {
        cout << max(dist1[i], dist2[i]) << (i == n ? "" : " ");
    }
    cout << "\n";
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
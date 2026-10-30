#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double
int INF = 1e9 + 7;
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;

    cin >> n >> m;
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back({v, 0});
        adj[v].push_back({u, 1});
    }

    vector<int> dist(n + 1, INF);
    deque<int> q;
    q.push_front(1);
    dist[1] = 0;
    while (!q.empty()) {
        auto node = q.front();
        q.pop_front();
        for (auto [neighbor, weight] : adj[node]) {
            if (dist[node] + weight < dist[neighbor]) {
                dist[neighbor] = dist[node] + weight;
                if (weight == 0) {
                    q.push_front(neighbor);
                } else {
                    q.push_back(neighbor);
                }
            }
        }
    }
    if (dist[n] == INF) {
        cout << -1 << '\n';
        return 0;
    } else {
        cout << dist[n] << '\n';
    }
}
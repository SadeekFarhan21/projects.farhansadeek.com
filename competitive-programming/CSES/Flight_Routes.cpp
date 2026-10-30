#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m, k;
    cin >> n >> m >> k;
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }

    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    vector<priority_queue<int>> dist(n + 1);
    pq.push({0, 1});
    dist[1].push(0);

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u].top()) {
            continue;
        }

        for (auto &edge : adj[u]) {
            int v = edge.first;
            int w = edge.second;
            int next_d = d + w;

            if ((int)dist[v].size() < k) {
                dist[v].push(next_d);
                pq.push({next_d, v});
            } else if (next_d < dist[v].top()) {
                dist[v].pop();
                dist[v].push(next_d);
                pq.push({next_d, v});
            }
        }
    }

    vector<int> ans;
    while (!dist[n].empty()) {
        ans.push_back(dist[n].top());
        dist[n].pop();
    }
    reverse(ans.begin(), ans.end());

    for (auto x : ans) {
        cout << x << " ";
    }
    return 0;
}
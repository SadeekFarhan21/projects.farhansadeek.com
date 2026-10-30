#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

int solve() {
    int n;
    cin >> n;
    vector<vector<pair<int, int>>> adj(n);
    vector<int> dist(n, 0);
    vector<int> in_degree(n, 0);
    for (int i = 0; i < n - 1; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});
        in_degree[v] += 1;
    }

    queue<int> q;
    int root = 0;
    for (int i = 0; i < n; i++) {
        if (in_degree[i] == 0) {
            root = i;
            break;
        }
    }
    q.push(root);
    dist[root] = 0;

    while (!q.empty()) {
        auto u = q.front();
        q.pop();
        for (auto [v, w] : adj[u]) {
            dist[v] = dist[u] + w;
            q.push(v);
        }
    }
    return *max_element(dist.begin(), dist.end());
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);

    int t;
    cin >> t;
    for (int i = 1; i <= t; i++) {
        cout << "Case " << i << ": " << solve() << "\n";
    }
    return 0;
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

string solve() {
    int n, e;
    cin >> n >> e;
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < e; i++) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }

    vector<int> color(n + 1, -1);
    queue<int> q;
    for (int i = 1; i <= n; i++) {
        if (color[i] == -1) {
            color[i] = 1;
            q.push(i);
            while (!q.empty()) {
                int node = q.front();
                q.pop();
                for (auto neighbor : adj[node]) {
                    if (color[neighbor] == -1) {
                        color[neighbor] = 3 - color[node];
                        q.push(neighbor);
                    } else if (color[node] == color[neighbor]) {
                        return "Suspicious bugs found!\n";
                    }
                }
            }
        }
    }
    return "No suspicious bugs found!\n";
}


int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        cout << "Scenario #" << i + 1 << ":\n";
        cout << solve();
    }
}
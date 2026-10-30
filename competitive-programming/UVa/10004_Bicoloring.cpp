#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

void solve(int n) {
    int l;
    cin >> l;
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < l; i++) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }

    vector<int> color(n + 1, -1);
    queue<int> q;
    q.push(0);
    color[0] = 1;
    while (!q.empty()) {
        auto node = q.front();
        q.pop();
        for (auto neighbor : adj[node]) {
            if (color[neighbor] == -1) {
                color[neighbor] = 3 - color[node];
                q.push(neighbor);
            } else if (color[node] == color[neighbor]) {
                cout << "NOT BICOLORABLE.\n";
                return;
            }
        }
    }
    cout << "BICOLORABLE.\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    while (cin >> n && n != 0) {
        solve(n);
    }
}
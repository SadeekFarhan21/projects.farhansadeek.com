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
    int n;
    cin >> n;
    vector<vector<int>> adj(n + 1);
    vector<int> in_degree(n + 1), out_degree(n + 1);
    vector<bool> matched(n + 1, false);
    for (int i = 0; i < n - 1; i++) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
        in_degree[u]++;
        in_degree[v]++;
        out_degree[u]++;
        out_degree[v]++;
    }
    queue<int> q;
    for (int i = 1; i <= n; i++) {
        if (in_degree[i] == 1 && out_degree[i] == 1) {
            q.push(i);
        }
    }
    int answer = 0;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        for (auto neighbor : adj[node]) {
            if (in_degree[neighbor] > 0 && out_degree[neighbor] > 0 && in_degree[node] > 0 && out_degree[node] > 0) {
                if (!matched[node] && !matched[neighbor]) {
                    matched[node] = true;
                    matched[neighbor] = true;
                    answer += 1;
                }
                in_degree[node]--;
                in_degree[neighbor]--;
                out_degree[node]--;
                out_degree[neighbor]--;
                if (in_degree[neighbor] == 1 && out_degree[neighbor] == 1) {
                    q.push(neighbor);
                }
            }
        }
    }
    cout << answer << '\n';
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double
vector<int> state;
vector<int> parent;
vector<vector<int>> adj;
int cycle_start = -1, cycle_end = -1;

bool dfs(int node) {
    state[node] = 1;
    for (auto neighbor : adj[node]) {
        if (state[neighbor] == 0) {
            parent[neighbor] = node;
            if (dfs(neighbor))
                return true;

        } else if (state[neighbor] == 1) {
            cycle_start = neighbor;
            cycle_end = node;
            return true;
        }
    }
    state[node] = 2;
    return false;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;
    cin >> n >> m;
    adj.resize(n + 1);
    state.assign(n + 1, 0);
    parent.assign(n + 1, -1);
    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        adj[a].push_back(b);
    }

    for (int i = 1; i <= n; i++) {
        if (state[i] == 0 && dfs(i)) {
            break;
        }
    }
    if (cycle_start == -1) {
        cout << "IMPOSSIBLE\n";
    } else {
        vector<int> cycle;
        cycle.push_back(cycle_start);
        for (int curr = cycle_end; curr != cycle_start; curr = parent[curr]) {
            cycle.push_back(curr);
        }
        cycle.push_back(cycle_start);
        reverse(cycle.begin(), cycle.end());
        cout << cycle.size() << "\n";
        for (auto e : cycle) {
            cout << e << " ";
        }
    }
    return 0;
}

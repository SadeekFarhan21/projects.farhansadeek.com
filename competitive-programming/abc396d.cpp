#include <bits/stdc++.h>
using namespace std;
#define int long long

int n, m;
vector<vector<pair<int, int>>> adj;
vector<bool> visited;
int answer = LLONG_MAX;

void dfs(int node, int cur) {
    if (node == n) {
        answer = min(answer, cur);
        return;
    }
    for (auto [neighbor, weight] : adj[node]) {
        if (!visited[neighbor]) {
            visited[neighbor] = true;
            dfs(neighbor, cur ^ weight);
            visited[neighbor] = false;
        }
    }
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    cin >> n >> m;
    adj.assign(n + 1, {});
    visited.assign(n + 1, false);
    for (int i = 0; i < m; i++) {
        int a, b, w;
        cin >> a >> b >> w;
        adj[a].push_back({b, w});
        adj[b].push_back({a, w});
    }
    visited[1] = true;
    dfs(1, 0);
    cout << answer << "\n";
}

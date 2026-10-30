#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double
const int N = 200000;
vector<int> adj[N + 1];
vector<bool> visited(N + 1, false);

void dfs(int i) {
    visited[i] = true;
    for (int neighbor : adj[i]) {
        if (!visited[neighbor]) {
            visited[neighbor] = true;
            dfs(neighbor);
        }
    }
}
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    int count = 0;
    for (int i = 1; i <= n; i++) {
        if (!visited[i]) {
            dfs(i);
            count += 1;
        }
    }
    cout << count << "\n";
    return 0;
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;
    cin >> n >> m;
    vector<vector<int>> adj(n + 1, vector<int>());
    vector<int> visited(n + 1, 0);
    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        adj[a].push_back(b);
        adj[b].push_back(a);
    }

    queue<int> q;
    q.push(1);
    visited[1] = 1;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        visited[node] = 1;
        for (int neighbor : adj[node]) {
            if (!visited[neighbor]) {
                q.push(neighbor);
            }
        }
    }

    int total = accumulate(visited.begin(), visited.end(), 0);
    if (total == n) {
        cout << "Connected\n";
    } else {
        for (int i = 1; i < (int)visited.size(); i++) {
            if (visited[i] == 0) {
                cout << i << "\n";
            }
        }
    }
    return 0;
}
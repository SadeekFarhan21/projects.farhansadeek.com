#include <bits/stdc++.h>
using namespace std;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, e;
    cin >> n >> e;
    vector<vector<int>> adj(n, vector<int>());
    vector<int> color(n, -1);
    vector<bool> visited(n, false);
    for (int i = 0; i < e; i++) {
        int a, b;
        cin >> a >> b;
        a--;
        b--;
        adj[a].push_back(b);
        adj[b].push_back(a);
    }

    queue<int> q;
    for (int i = 0; i < n; i++) {
        if (color[i] == -1) {
            q.push(i);
            color[i] = 1;
            visited[i] = true;
            while (!q.empty()) {
                int node = q.front();
                q.pop();
                for (int neighbor : adj[node]) {
                    if (color[neighbor] == -1) {
                        color[neighbor] = 3 - color[node];
                        q.push(neighbor);

                    } else if (color[node] == color[neighbor]) {
                        cout << "Impossible\n";
                        return 0;
                    }
                }
            }
        }
    }
    for (int i = 0; i < n; i++) {
        cout << color[i] << " ";
    }
    return 0;
}
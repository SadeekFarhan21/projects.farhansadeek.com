#include <iostream>
#include <vector>
#include <queue>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    int n, m;
    while (cin >> n >> m) {
        if (n == 0 && m == 0) {
            break;
        }

        vector<vector<int>> adj(n + 1);
        vector<int> in_degree(n + 1, 0);

        for (int k = 0; k < m; k++) {
            int u, v;
            cin >> u >> v;
            adj[u].push_back(v);
            in_degree[v]++;
        }

        queue<int> q;
        vector<int> answer;

        for (int i = 1; i <= n; i++) {
            if (in_degree[i] == 0) {
                answer.push_back(i);
                q.push(i);
            }
        }

        while (!q.empty()) {
            int u = q.front();
            q.pop();

            for (size_t i = 0; i < adj[u].size(); i++) {
                int v = adj[u][i];
                in_degree[v]--;
                if (in_degree[v] == 0) {
                    answer.push_back(v);
                    q.push(v);
                }
            }
        }

        for (int i = 0; i < n; i++) {
            cout << answer[i] << (i == n - 1 ? "" : " ");
        }
        cout << "\n";
    }

    return 0;
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;
    cin >> n >> m;
    int a, b;
    vector<vector<int>> adj(n);
    vector<int> in_degree(n);
    for (int i = 0; i < m; i++) {
        cin >> a >> b;
        a--;
        b--;
        adj[a].push_back(b);
        in_degree[b]++;
    }
    queue<int> q;
    for (int i = 0; i < n; i++) {
        if (in_degree[i] == 0) {
            q.push(i);
        }
    }
    vector<int> answer;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        answer.push_back(node + 1);
        for (int neighbor : adj[node]) {
            in_degree[neighbor]--;
            if (in_degree[neighbor] == 0) {
                q.push(neighbor);
            }
        }
    }
    if (answer.size() == n) {
        for (int i = 0; i < (int)answer.size(); i++) {
            cout << answer[i] << '\n';
        }
    } else {
        cout << "IMPOSSIBLE\n";
    }
    return 0;
}
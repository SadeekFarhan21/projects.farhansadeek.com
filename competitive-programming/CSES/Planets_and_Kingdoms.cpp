#include <bits/stdc++.h>
using namespace std;
const int N = 1e5 + 5;
#define int long long

void dfs1(int node, vector<vector<int>> &adj, vector<bool> &visited1, stack<int> &order) {
    visited1[node] = true;
    for (auto neighbor : adj[node]) {
        if (!visited1[neighbor]) {
            dfs1(neighbor, adj, visited1, order);
        }
    }
    order.push(node);
}

void dfs2(int node, vector<vector<int>> &rev, vector<bool> &visited2, vector<int> &answer, int scc) {
    answer[node] = scc;
    visited2[node] = true;
    for (auto neighbor : rev[node]) {
        if (!visited2[neighbor]) {
            dfs2(neighbor, rev, visited2, answer, scc);
        }
    }
}

int32_t main() {
    int n, m;
    cin >> n >> m;

    vector<vector<int>> adj(n);
    vector<vector<int>> rev(n);
    vector<bool> visited1(n, false);
    vector<bool> visited2(n, false);
    stack<int> order;
    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        a--, b--;
        adj[a].push_back(b);
        rev[b].push_back(a);
    }

    for (int i = 0; i < n; i++) {
        if (!visited1[i]) {
            dfs1(i, adj, visited1, order);
        }
    }
    vector<int> answer(n);
    int scc = 0;
    while (!order.empty()) {
        int node = order.top();
        order.pop();

        if (!visited2[node]) {
            dfs2(node, rev, visited2, answer, scc);
            scc++;
        }
    }

    cout << scc << "\n";
    for (auto x : answer) {
        cout << x + 1 << ' ';
    }
    return 0;
}

#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, e;
    cin >> n >> e;
    vector<vector<pair<int, int>>> adj_list(n + 1);
    for (int i = 0; i < e; i++) {
        int a, b, c;
        cin >> a >> b >> c;
        adj_list[a].push_back({b, c});
    }

    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    vector<int> distance(n + 1, 1e19);
    int source = 1;
    distance[source] = 0;
    pq.push({0, source});
    while (!pq.empty()) {
        auto [d, node] = pq.top();
        pq.pop();
        if (d > distance[node])
            continue;
        for (auto &[neighbor, weight] : adj_list[node]) {

            if (distance[node] + weight < distance[neighbor]) {
                distance[neighbor] = distance[node] + weight;
                pq.push({distance[neighbor], neighbor});
            }
        }
    }
    for (int i = 1; i <= n; i++) {
        if (distance[i] == 1e19) {
            cout << -1 << " ";
        } else {
            cout << distance[i] << " ";
        }
    }
    cout << "\n";
    return 0;
}
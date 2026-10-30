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

    vector<vector<pair<int, int>>> graph(n + 1);
    for (int i = 0; i < e; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        graph[u].push_back({v, w});
    }

    const int INF = numeric_limits<int>::max() / 4;
    vector<vector<int>> dist(n + 1, vector<int>(2, INF));
    priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<tuple<int, int, int>>> pq;

    dist[1][0] = 0;
    pq.push({0, 1, 0});

    while (!pq.empty()) {
        auto [cost, node, used_discount] = pq.top();
        pq.pop();

        if (cost != dist[node][used_discount]) {
            continue;
        }

        for (auto [neighbor, price] : graph[node]) {
            if (cost + price < dist[neighbor][used_discount]) {
                dist[neighbor][used_discount] = cost + price;
                pq.push({dist[neighbor][used_discount], neighbor, used_discount});
            }

            if (!used_discount && cost + price / 2 < dist[neighbor][1]) {
                dist[neighbor][1] = cost + price / 2;
                pq.push({dist[neighbor][1], neighbor, 1});
            }
        }
    }

    cout << dist[n][1] << "\n";
    return 0;
}
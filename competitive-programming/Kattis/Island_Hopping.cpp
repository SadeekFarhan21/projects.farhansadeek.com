#include <bits/stdc++.h>
using namespace std;

struct Edge {
    int u, v;
    double w;
};

struct DSU {
    vector<int> parent, sz;
    DSU(int n) {
        parent.resize(n);
        sz.assign(n, 1);
        for (int i = 0; i < n; i++) {
            parent[i] = i;
        }
    }

    int find(int x) {
        if (parent[x] == x) {
            return x;
        }
        return parent[x] = find(parent[x]);
    }

    bool unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) {
            return false;
        }
        if (sz[a] < sz[b]) {
            swap(a, b);
        }
        sz[a] += sz[b];
        parent[b] = a;
        return true;
    }
};

void solve() {
    int n;
    cin >> n;
    vector<pair<double, double>> points(n);
    for (int i = 0; i < n; i++) {
        cin >> points[i].first >> points[i].second;
    }
    vector<Edge> edges;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            edges.push_back({i, j, hypot(points[i].first - points[j].first, points[i].second - points[j].second)});
        }
    }
    sort(edges.begin(), edges.end(), [](const Edge &a, const Edge &b) {
        return a.w < b.w;
    });

    DSU dsu(n);
    double cost = 0;
    int edges_used = 0;
    for (auto &edge : edges) {
        if (dsu.unite(edge.u, edge.v)) {
            cost += edge.w;
            edges_used += 1;
        }
        if (edges_used == n) {
            break;
        }
    }
    printf("%.10f\n", cost);
}
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
    return 0;
}

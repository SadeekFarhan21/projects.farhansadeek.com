#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

struct Edge {
    int u, v, w;
};

struct DSU {
    vector<int> sz, parent;
    DSU(int n) {
        sz.assign(n, 1);
        parent.resize(n);
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

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int m, n;
    while (cin >> n >> m && m != 0 && n != 0) {
        vector<Edge> edges(m);
        int possible = 0;
        for (int i = 0; i < m; i++) {
            cin >> edges[i].u >> edges[i].v >> edges[i].w;
            possible += edges[i].w;
        }

        sort(edges.begin(), edges.end(), [](const Edge &a, const Edge &b) {
            return a.w < b.w;
        });
        DSU dsu(n);
        int edges_used = 0;
        int total_cost = 0;
        for (auto &edge : edges) {
            if (dsu.unite(edge.u, edge.v)) {
                edges_used += 1;
                total_cost += edge.w;
            }
            if (edges_used == n) {
                break;
            }
        }
        int savings = possible - total_cost;
        cout << savings << '\n';
    }
    return 0;
}
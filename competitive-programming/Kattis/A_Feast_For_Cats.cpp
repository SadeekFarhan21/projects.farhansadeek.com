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
        parent[b] = a;
        sz[a] += sz[b];
        return true;
    }
};

void solve() {
    int milk, n;
    cin >> milk >> n;
    int m = (n * (n - 1)) / 2;
    vector<Edge> edges(m);
    for (int i = 0; i < m; i++) {
        cin >> edges[i].u >> edges[i].v >> edges[i].w;
    }
    sort(edges.begin(), edges.end(), [](const Edge &a, const Edge &b) { return a.w < b.w; });
    DSU dsu(n);
    int edges_used = 0;
    int total_cost = 0;
    for (auto &[u, v, w] : edges) {
        if (dsu.unite(u, v)) {
            edges_used += 1;
            total_cost += w;
        }
        if (edges_used == n - 1) {
            break;
        }
    }
    if (edges_used == n - 1 && total_cost + n <= milk) {
        cout << "yes\n";
    } else {
        cout << "no\n";
    }
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
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

struct DSU {
    vector<int> parent, sz;

    DSU(int n) {
        sz.resize(n);
        parent.assign(n, 1);
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

struct Edge {
    int u, v, w;
};

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<Edge> edges;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            int a;
            cin >> a;
            if (j > i) {
                edges.push_back({i , j , a});
            }
        }
    }

    sort(edges.begin(), edges.end(), [](const Edge &a, const Edge &b) {
        return a.w < b.w;
    });
    vector<pair<int, int>> answer;
    DSU dsu(n);

    int cost = 0;
    int edges_used = 0;
    for (auto &edge : edges) {
        if (dsu.unite(edge.u, edge.v)) {
            cost += edge.w;
            edges_used += 1;
            answer.push_back({edge.u + 1, edge.v + 1});
        }
        if (edges_used == n - 1) {
            break;
        }
    }
    sort(answer.begin(), answer.end());
    for (auto [a, b] : answer) {
        cout << a << ' ' << b << '\n';
    }

    return 0;
}
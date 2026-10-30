#include <bits/stdc++.h>
using namespace std;

int parent[100000];
int setSize[100000];

int dsuFind(int a) {
    if (parent[a] == a)
        return a;
    return parent[a] = dsuFind(parent[a]);
}

void dsuUnion(int a, int b) {
    int leader_a = dsuFind(a);
    int leader_b = dsuFind(b);
    if (leader_a != leader_b) {
        if (setSize[leader_b] < setSize[leader_a]) {
            swap(leader_a, leader_b);
        }
        parent[leader_a] = leader_b;
        setSize[leader_b] += setSize[leader_a];
    }
}

int main() {
    int n, m;
    cin >> n >> m;
    for (int i = 1; i <= n; i++) {
        parent[i] = i;
        setSize[i] = 1;
    }
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        dsuUnion(u, v);
    }
    int count = 0;
    unordered_set<int> parents;
    for (int i = 1; i <= n; i++) {
        parents.insert(parent[i]);
    }
    cout << parents.size() - 1 << "\n";
    return 0;
}
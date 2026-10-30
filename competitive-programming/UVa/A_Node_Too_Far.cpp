#include <bits/stdc++.h>
using namespace std;

int main() {
    int nc;
    int caseNum = 1;

    while (cin >> nc && nc != 0) {
        map<int, vector<int>> adjList;
        for (int i = 0; i < nc; ++i) {
            int u, v;
            cin >> u >> v;
            adjList[u].push_back(v);
            adjList[v].push_back(u);
        }
        int startNode, ttl;
        while (cin >> startNode >> ttl && (startNode != 0 || ttl != 0)) {
            caseNum++;
        }
    }

    return 0;
}
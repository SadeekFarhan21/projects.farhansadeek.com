#include <bits/stdc++.h>
using namespace std;

const int maxN = 1e6;
vector<vector<int>> adj(maxN);
vector <bool> visited(maxN);
stack <int> traversal;

void dfs(int node){

    visited[node] = true;
    for(auto u : adj[node]){
        if(!visited[node]){
            dfs(u);
        }
    }
    traversal.push(node);
}

int main(){
    int n; cin >> n;
    for(int i = 1; i < n; i++){
        int p, c; cin >> p >> c;
        adj[p].push_back(c);
    }

    for(int i = 1; i <= n; i++){
        if(!visited[i]){
            dfs(i);
        }
    }

    while(!traversal.empty()){
        cout << traversal.top() << " ";
        traversal.pop();
    }
}
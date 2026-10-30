#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double
const int N = 1e5 + 1;
const int M = 2e5 + 1;
vector<int> adj[N + 1];
vector<vector<int>> components;
void solve() {}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;
    cin >> n >> m;
    for(int i = 0; i < m; i++){
        int a, b; cin >> a >> b;
        adj[a].push_back(b);
        adj[b].push_back(a);

    }
    
return 0;}
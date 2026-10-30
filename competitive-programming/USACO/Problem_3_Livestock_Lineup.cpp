#include <bits/stdc++.h>
using namespace std;

vector<int> adj[8];
vector<int> v(8);
// ifstream cin("lineup.in");
// ofstream cout("lineup.out");

map<string, int> m1 {
    {"Beatrice", 0},
    {"Belinda", 1},
    {"Bella", 2},
    {"Bessie", 3},
    {"Betsy", 4},
    {"Blue", 5},
    {"Buttercup", 6},
    {"Sue", 7}};

map<int, string> m2 {
    // ['Beatrice', 'Belinda', 'Bella', 'Bessie', 'Betsy', 'Blue', 'Buttercup', 'Sue']
    {0, "Beatrice"},
    {1, "Belinda"},
    {2, "Bella"},
    {3, "Bessie"},
    {4, "Betsy"},
    {5, "Blue"},
    {6, "Buttercup"},
    {7, "Sue"}};

void dfs(int node)
{
    v[node] = 1;
    cout << m2[node] << "\n";
    for (auto u : adj[node]){
        if (!v[u]){
            dfs(u);
        }
    }
}

int main()
{
    
    
    int n; cin >> n;
    for (int i = 0; i < n; i++){
        string w, x, y, z;
        string a, b;
        cin >> a >> w >> x >> y >> z >> b;
        // cout << a << " " << b << "\n";
        adj[m1[a]].push_back(m1[b]);
        adj[m1[b]].push_back(m1[a]);
    }

    for (int i = 0; i < 8; i++){
        if (!v[i]){
            dfs(i);
        }
    }
    
    // cin.close();
    // cout.close();
    return 0;
}
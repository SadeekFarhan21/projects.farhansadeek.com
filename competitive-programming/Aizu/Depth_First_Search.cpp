#include <bits/stdc++.h>
using namespace std;
vector<pair<int, pair<int, int>>> times;
void dfs(int node, vector<int> &visited, vector<int> &start, vector<int> &finish, int &time, const vector<vector<int>> &adj_list)
{
    visited[node] = 1;
    start[node] = ++time;
    for (int neighbor : adj_list[node])
    {
        if (!visited[neighbor])
        {
            dfs(neighbor, visited, start, finish, time, adj_list);
        }
    }

    finish[node] = ++time;
    times.push_back({node, {start[node], finish[node]}});
}

int32_t main()
{
    int n;
    cin >> n;
    vector<vector<int>> adj_list(n + 1);
    vector<int> start(n + 1);
    vector<int> finish(n + 1);
    vector<int> visited(n + 1, false);
    stack<int> s;
    s.push(1);
    int time = 0;
    for (int i = 1; i <= n; i++)
    {
        int node, degree;
        cin >> node >> degree;
        for (int j = 0; j < degree; j++)
        {
            int destination;
            cin >> destination;
            adj_list[node].push_back(destination);
        }
    }

    for (int i = 1; i <= n; i++)
    {
        if (!visited[i])
        {
            dfs(i, visited, start, finish, time, adj_list);
        }
    }

    // cout << times.size() << "\n";
    sort(times.begin(), times.end());
    for (const auto &entry : times)
    {
        cout << entry.first << " " << entry.second.first << " " << entry.second.second << "\n";
    }
    return 0;
}

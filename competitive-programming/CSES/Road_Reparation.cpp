#include <bits/stdc++.h>
using namespace std;
const int N = 1e5 + 5;
#define int long long
vector<vector<pair<int, int>>> adj(N);

int32_t main()
{
    int n, m;
    cin >> n >> m;

    for (int i = 0; i < m; i++)
    {
        int a, b, wt;
        cin >> a >> b >> wt;
        adj[a].push_back({b, wt});
        adj[b].push_back({a, wt});
    }

    vector<bool> in_mst(n + 1, false);
    vector<int> key(n + 1, INT_MAX);
    vector<int> parent(n + 1, -1);

    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;

    key[1] = 0;
    pq.push({0, 1});

    while (!pq.empty())
    {
        int u = pq.top().second;
        pq.pop();

        if (in_mst[u])
            continue;

        in_mst[u] = true;

        for (auto x : adj[u])
        {
            int v = x.first;
            int weight = x.second;

            if (!in_mst[v] && weight < key[v])
            {
                key[v] = weight;
                parent[v] = u;
                pq.push({key[v], v});
            }
        }
    }

    int cost = 0;
    for (int i = 2; i <= n; i++)
    {
        if (parent[i] != -1)
        {
            cost += key[i];
        }
    }
    bool all_connected = true;
    for (int i = 1; i <= n; i++)
    {
        if (!in_mst[i])
        {
            all_connected = false;
            break;
        }
    }

    if (all_connected)
    {
        cout << cost << "\n";
    }
    else
    {
        cout << "IMPOSSIBLE\n";
    }
    return 0;
}

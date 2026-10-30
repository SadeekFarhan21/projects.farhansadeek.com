#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double
int INF = 1e8 + 1;
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    string s;
    cin >> s;
    int n = s.size();
    vector<int> digit_index[10];
    for (int i = 0; i < n; i++) {
        digit_index[s[i] - '0'].push_back(i);
    }

    queue<int> q;
    q.push(0);
    vector<int> dist(n, INF);
    dist[0] = 0;
    while (!q.empty()) {
        int curr = q.front();
        q.pop();
        if (curr == n - 1) {
            cout << dist[n - 1] << '\n';
            return 0;
        }

        int d = s[curr] - '0';
        for (auto next_index : digit_index[d]) {
            if (dist[next_index] == INF) {
                dist[next_index] = dist[curr] + 1;
                q.push(next_index);
            }
        }
        digit_index[d].clear();

        if (curr - 1 >= 0 && dist[curr - 1] == INF) {
            dist[curr - 1] = dist[curr] + 1;
            q.push(curr - 1);
        }

        if (curr + 1 < n && dist[curr + 1] == INF) {
            dist[curr + 1] = dist[curr] + 1;
            q.push(curr + 1);
        }
    }
    cout << dist[n - 1] << '\n';
    return 0;
}
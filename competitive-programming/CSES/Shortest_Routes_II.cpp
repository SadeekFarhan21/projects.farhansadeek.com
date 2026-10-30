#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m, q;
    cin >> n >> m >> q;
    vector<vector<int>> distance(n + 1, vector<int>(n + 1, 1e18));
    for (int i = 1; i <= n; i++) {
        distance[i][i] = 0;
    }

    for (int i = 0; i < m; i++) {
        int a, b, c;
        cin >> a >> b >> c;
        distance[a][b] = min(distance[a][b], c);
        distance[b][a] = min(distance[b][a], c);
    }

    for (int k = 1; k <= n; k++) {
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= n; j++) {
                distance[i][j] = min(distance[i][j], distance[i][k] + distance[k][j]);
                distance[j][i] = min(distance[j][i], distance[j][k] + distance[k][i]);
            }
        }
    }

    for (int i = 0; i < q; i++) {
        int a, b;
        cin >> a >> b;
        cout << (distance[a][b] == 1e18 ? -1 : distance[a][b]) << "\n";
    }
    cout << "\n";
    return 0;
}

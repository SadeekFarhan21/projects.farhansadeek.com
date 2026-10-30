#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    // freopen("input.txt", "r", stdin);
    // freopen("output.txt", "w", stdout);
    int m, n;
    cin >> m >> n;
    vector<vector<int>> distance(m + 1, vector<int>(n + 1));
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            distance[i][j] = 1e9;
        }
    }
    queue<pair<int, int>> q;
    int k;
    cin >> k;
    for (int i = 0; i < k; i++) {
        int x, y;
        cin >> x >> y;
        q.push({x, y});
        distance[x][y] = 0;
    }
    vector<int> dx = {1, -1, 0, 0};
    vector<int> dy = {0, 0, 1, -1};
    while (!q.empty()) {
        int x = q.front().first;
        int y = q.front().second;
        q.pop();
        for (int j = 0; j < 4; j++) {
            int new_x = x + dx[j];
            int new_y = y + dy[j];
            if (new_x > 0 && new_x <= m && new_y > 0 && new_y <= n) {
                if (distance[x][y] + 1 < distance[new_x][new_y]) {
                    distance[new_x][new_y] = distance[x][y] + 1;
                    q.push({new_x, new_y});
                }
            }
        }
    }

    int farthest = -1;
    pair<int, int> answer = {1, 1};
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (distance[i][j] > farthest) {
                farthest = distance[i][j];
                answer.first = i;
                answer.second = j;
            }
        }
    }
    cout << answer.first << " " << answer.second << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    solve();
}

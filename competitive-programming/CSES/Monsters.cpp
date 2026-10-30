#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int m, n;
    cin >> m >> n;
    vector<vector<char>> grid(m, vector<char>(n));
    vector<vector<int>> monster_distance(m, vector<int>(n, 1e12));
    vector<vector<int>> distance(m, vector<int>(n, 1e12));
    queue<pair<int, int>> monster_queue;
    queue<pair<int, int>> q;
    pair<int, int> start;
    vector<vector<pair<int, int>>> parent(m, vector<pair<int, int>>(n, {-1, -1}));
    vector<vector<char>> parent_dir(m, vector<char>(n));
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            cin >> grid[i][j];
            if (grid[i][j] == 'M') {
                monster_queue.push({i, j});
                monster_distance[i][j] = 0;
            } else if (grid[i][j] == 'A') {
                q.push({i, j});
                start = {i, j};
                distance[i][j] = 0;
            }
        }
    }

    vector<int> dx = {1, -1, 0, 0};
    vector<int> dy = {0, 0, 1, -1};
    vector<char> d = {'D', 'U', 'R', 'L'};
    while (!monster_queue.empty()) {
        auto [r, c] = monster_queue.front();
        monster_queue.pop();
        for (int i = 0; i < 4; i++) {
            int new_r = r + dx[i];
            int new_c = c + dy[i];
            if (new_r >= 0 && new_r < m && new_c >= 0 && new_c < n && grid[new_r][new_c] != '#') {
                if (1 + monster_distance[r][c] < monster_distance[new_r][new_c]) {
                    monster_distance[new_r][new_c] = 1 + monster_distance[r][c];
                    monster_queue.push({new_r, new_c});
                }
            }
        }
    }
    pair<int, int> escape_cell = {-1, -1};
    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        if (r == 0 || r == m - 1 || c == 0 || c == n - 1) {
            escape_cell = {r, c};
            break;
        }
        for (int i = 0; i < 4; i++) {
            int new_r = r + dx[i];
            int new_c = c + dy[i];
            if (new_r >= 0 && new_r < m && new_c >= 0 && new_c < n && grid[new_r][new_c] != '#') {
                int new_distance = 1 + distance[r][c];
                if (new_distance < distance[new_r][new_c] && new_distance < monster_distance[new_r][new_c]) {
                    distance[new_r][new_c] = new_distance;
                    parent[new_r][new_c] = {r, c};
                    parent_dir[new_r][new_c] = d[i];
                    q.push({new_r, new_c});
                }
            }
        }
    }
    if (escape_cell.first == -1) {
        cout << "NO\n";
    } else {
        cout << "YES\n";
        string path = "";
        pair<int, int> curr = escape_cell;

        while (curr != start) {
            path += parent_dir[curr.first][curr.second];
            curr = parent[curr.first][curr.second];
        }

        reverse(path.begin(), path.end());
        cout << path.length() << "\n";
        cout << path << "\n";
    }
    return 0;
}

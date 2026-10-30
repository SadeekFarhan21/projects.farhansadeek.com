#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double
static const int dx[] = {0, 0, 1, -1};
static const int dy[] = {1, -1, 0, 0};
void dfs(int x, int y, int n, int m, vector<vector<char>> &grid, vector<vector<bool>> &visited) {
    visited[x][y] = true;
    for (int i = 0; i < 4; i++) {
        int new_x = x + dx[i];
        int new_y = y + dy[i];
        if (new_x >= 0 && new_x < n && new_y >= 0 && new_y < m && !visited[new_x][new_y] && (grid[new_x][new_y] == 'C' || grid[new_x][new_y] == 'L')) {
            dfs(new_x, new_y, n, m, grid, visited);
        }
    }
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);

    int n, m;
    cin >> n >> m;

    vector<vector<char>> grid(n, vector<char>(m));
    vector<vector<bool>> visited(n, vector<bool>(m, false));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            cin >> grid[i][j];
        }
    }
    int count = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            if (!visited[i][j] && grid[i][j] == 'L') {
                dfs(i, j, n, m, grid, visited);
                count += 1;
            }
        }
    }
    cout << count << '\n';

    return 0;
}
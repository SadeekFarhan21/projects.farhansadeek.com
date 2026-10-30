#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

void dfs(int x, int y, int n, int m, vector<vector<bool>> &visited, vector<string> &grid) {
    visited[x][y] = true;
    vector<int> dx = {1, -1, 0, 0};
    vector<int> dy = {0, 0, 1, -1};
    for (int i = 0; i < 4; i++) {
        int new_x = x + dx[i];
        int new_y = y + dy[i];
        if (new_x >= 0 && new_x < n && new_y >= 0 && new_y < m && !visited[new_x][new_y] && grid[new_x][new_y] == '-') {
            dfs(new_x, new_y, n, m, visited, grid);
        }
    }
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int x, y;
    int i = 1;
    while (cin >> x >> y) {
        vector<string> grid(x);
        vector<vector<bool>> visited(x, vector<bool>(y, false));
        for (int i = 0; i < x; i++) {
            cin >> grid[i];
        }
        int count = 0;
        for (int i = 0; i < x; i++) {
            for (int j = 0; j < y; j++) {
                if (grid[i][j] == '-' && !visited[i][j]) {
                    dfs(i, j, x, y, visited, grid);
                    count += 1;
                }
            }
        }
        cout << "Case " << i << ": " << count << '\n';
        i += 1;
    }
    return 0;
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

void dfs(int x, int y, int n, vector<string> &grid, vector<vector<int>> &visited) {
    visited[x][y] = 1;
    vector<int> dx = {0, 0, 1, -1, 1, -1, 1, -1};
    vector<int> dy = {1, -1, 0, 0, -1, 1, 1, -1};
    for (int i = 0; i < 8; i++) {
        int new_x = x + dx[i];
        int new_y = y + dy[i];
        if (new_x >= 0 && new_x < n && new_y >= 0 && new_y < n && visited[new_x][new_y] == 0 && grid[new_x][new_y] == '1') {
            dfs(new_x, new_y, n, grid, visited);
        }
    }
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);

    int n;
    int t = 1;

    while (cin >> n) {
        vector<string> grid(n);
        vector<vector<int>> visited(n, vector<int>(n, 0));
        for (int i = 0; i < n; i++) {
            cin >> grid[i];
        }
        int count = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (visited[i][j] == 0 && grid[i][j] == '1') {
                    dfs(i, j, n, grid, visited);
                    count += 1;
                }
            }
        }
        cout << "Image number " << t << " contains " << count << " war eagles.\n";
        t += 1;
    }
    return 0;
}

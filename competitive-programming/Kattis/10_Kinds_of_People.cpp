#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double
static const int dx[] = {1, -1, 0, 0};
static const int dy[] = {0, 0, -1, 1};
void dfs(int x, int y, int a, int b, int count, vector<vector<bool>> &visited, vector<vector<int>> &grid, vector<vector<int>> &component) {
    visited[x][y] = true;
    component[x][y] = count;
    int value = grid[x][y];
    for (int i = 0; i < 4; i++) {
        int new_x = x + dx[i];
        int new_y = y + dy[i];
        if (new_x >= 0 && new_x < a && new_y >= 0 && new_y < b && !visited[new_x][new_y] && grid[new_x][new_y] == value) {
            dfs(new_x, new_y, a, b, count, visited, grid, component);
        }
    }
}
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int a, b;
    cin >> a >> b;
    vector<vector<int>> grid(a, vector<int>(b));
    vector<vector<int>> component(a, vector<int>(b, 0));
    vector<vector<bool>> visited(a, vector<bool>(b, false));
    for (int i = 0; i < a; i++) {
        for (int j = 0; j < b; j++) {
            char digit;
            cin >> digit;
            grid[i][j] = digit - '0';
        }
    }

    int count = 1;
    for (int i = 0; i < a; i++) {
        for (int j = 0; j < b; j++) {
            if (!visited[i][j]) {
                dfs(i, j, a, b, count, visited, grid, component);
                count += 1;
            }
        }
    }

    int n;
    cin >> n;
    for (int i = 0; i < n; i++) {
        int r1, c1, r2, c2;
        cin >> r1 >> c1 >> r2 >> c2;
        r1--;
        c1--;
        r2--;
        c2--;
        if (component[r1][c1] == component[r2][c2]) {
            if (grid[r1][c1] == 1) {
                cout << "decimal\n";
            } else {
                cout << "binary\n";
            }
        } else {
            cout << "neither\n";
        }
    }
}
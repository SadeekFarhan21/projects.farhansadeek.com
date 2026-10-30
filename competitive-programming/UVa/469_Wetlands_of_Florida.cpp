#include <iostream>
#include <queue>
#include <sstream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

int get_water_size(const vector<string> &grid, int r, int c) {
    if (grid[r - 1][c - 1] == 'L') {
        return 0;
    }

    int size = 0;
    queue<pair<int, int>> water;
    vector<vector<bool>> visited(grid.size(), vector<bool>(grid[0].size(), false));
    vector<int> dx = {0, 0, 1, -1, 1, 1, -1, -1};
    vector<int> dy = {1, -1, 0, 0, 1, -1, 1, -1};
    water.push({r - 1, c - 1});
    visited[r - 1][c - 1] = true;
    while (!water.empty()) {
        auto [x, y] = water.front();
        water.pop();
        size += 1;
        for (int i = 0; i < 8; i++) {
            int new_x = x + dx[i];
            int new_y = y + dy[i];
            if (new_x >= 0 && new_x < (int)grid.size() && new_y >= 0 && new_y < (int)grid[0].size() && grid[new_x][new_y] == 'W' && !visited[new_x][new_y]) {
                water.push({new_x, new_y});
                visited[new_x][new_y] = true;
            }
        }
    }
    return size;
}

void solve() {
    vector<string> grid;
    string line;

    while (getline(cin, line)) {
        if (line.empty()) {
            continue;
        }
        if (line[0] != 'L' && line[0] != 'W') {
            break;
        }
        grid.push_back(line);
    }

    while (!line.empty()) {
        stringstream ss(line);
        int r, c;
        if (ss >> r >> c) {
            cout << get_water_size(grid, r, c) << "\n";
        }
        if (!getline(cin, line))
            break;
        if (line.empty()) {
            break;
        }
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    if (!(cin >> t))
        return 0;

    string line;
    getline(cin, line);

    for (int i = 0; i < t; i++) {
        if (i > 0)
            cout << "\n";
        solve();
    }

    return 0;
}
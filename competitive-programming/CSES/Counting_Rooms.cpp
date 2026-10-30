#include <bits/stdc++.h>
using namespace std;

const int dx[] = {-1, 0, 1, 0};
const int dy[] = {0, 1, 0, -1};

void dfs(vector<vector<char>> &matrix, vector<vector<bool>> &visited, int x, int y, int a, int b)
{
    visited[x][y] = true;
    for (int i = 0; i < 4; i++)
    {
        int nx = x + dx[i];
        int ny = y + dy[i];
        if (nx >= 0 && nx < a && ny >= 0 && ny < b && matrix[nx][ny] == '.' && !visited[nx][ny])
        {
            dfs(matrix, visited, nx, ny, a, b);
        }
    }
}
int32_t main()
{
    int a, b;
    cin >> a >> b;
    vector<vector<char>> matrix(a, vector<char>(b));
    vector<vector<bool>> visited(a, vector<bool>(b, false));
    for (int i = 0; i < a; i++)
    {
        for (int j = 0; j < b; j++)
        {
            cin >> matrix[i][j];
        }
    }
    int answer = 0;
    for (int i = 0; i < a; i++)
    {
        for (int j = 0; j < b; j++)
        {
            if (matrix[i][j] == '.' && !visited[i][j])
            {
                dfs(matrix, visited, i, j, a, b);
                answer++;
            }
        }
    }
    cout << answer << "\n";
}
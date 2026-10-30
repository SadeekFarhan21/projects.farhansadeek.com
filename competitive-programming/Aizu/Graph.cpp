#include <bits/stdc++.h>
using namespace std;

int32_t main()
{
    int n;
    cin >> n;
    int mat[n + 1][n + 1] = {};

    for (int i = 1; i <= n; i++)
    {
        int u, deg;
        cin >> u >> deg;
        for (int j = 0; j < deg; j++)
        {
            int v;
            cin >> v;
            mat[u][v] = 1;
        }
    }

    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= n; j++)
        {
            cout << mat[i][j];
            if (j == n)
            {
                cout << "\n";
            }
            else
            {
                cout << " ";
            }
        }
    }
    return 0;
}

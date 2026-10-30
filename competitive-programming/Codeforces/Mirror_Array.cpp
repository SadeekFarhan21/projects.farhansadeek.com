#include <bits/stdc++.h>
using namespace std;
#define int long long int

int32_t main()
{
    int a, b;
    cin >> a >> b;
    int matrix[a + 1][b + 1];
    for (int i = 1; i <= a; i++)
    {
        for (int j = 1; j <= b; j++)
        {
            cin >> matrix[i][j];
        }
    }
    for (int i = 1; i <= a; i++)
    {
        for (int j = b; j >= 1; j--)
        {
            cout << matrix[i][j] << " ";
        }
        cout << "\n";
    }

    return 0;
}
#include <bits/stdc++.h>
using namespace std;

const int MAX_DAYS = 50;

int main()
{
    int c, n, m;
    cin >> c >> n >> m;
    int dp[MAX_DAYS + 1][c + 1];
    memset(dp, 0, sizeof(dp));

    for (int i = 0; i < n; i++)
    {
        int cows;
        cin >> cows;
        dp[0][cows]++;
    }

    for (int day = 0; day < MAX_DAYS; day++)
    {
        for (int i = 1; i <= c; i++)
        {
            if (i <= c / 2)
            {
                dp[day + 1][i * 2] += dp[day][i];
            }
            else
            {
                dp[day + 1][i] += 2 * dp[day][i];
                        }
        }
    }

    for (int i = 0; i < m; i++)
    {
        int d;
        cin >> d;
        int farms = 0;
        for (int j = 0; j <= c; j++)
        {
            farms += dp[d][j];
        }
        cout << farms << endl;
    }
    return 0;
}
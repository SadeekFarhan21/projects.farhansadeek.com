#include <bits/stdc++.h>
using namespace std;
const int MOD = 1e9 + 7;
int main()
{
    int n, x;
    cin >> n >> x;
    vector<int> coins(n);
    vector<int> dp(1e6 + 1);
    dp[0] = 1;
    for (int i = 0; i < n; i++)
    {
        cin >> coins[i];
    }
    for (int weight = 0; weight <= x; weight++)
    {
        for (int i = 1; i <= n; i++)
        {
            if (weight - coins[i - 1] >= 0)
            {
                dp[weight] += dp[weight - coins[i - 1]];
                dp[weight] %= MOD;
            }
        }
    }
    cout << dp[x] << "\n";
}
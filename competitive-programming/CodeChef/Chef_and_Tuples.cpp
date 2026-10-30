#include <bits/stdc++.h>
using namespace std;
#define int long long int

void solve()
{
    int n, a, b, c;
    cin >> n >> a >> b >> c;
    vector<int> divisors;

    for (int i = 1; i <= sqrt(n); ++i)
    {
        if (n % i == 0)
        {
            divisors.push_back(i);
            if (i != n / i)
            {
                divisors.push_back(n / i);
            }
        }
    }
    int answer = 0;
    int size = divisors.size();
    for (int i = 0; i < size; i++)
    {
        for (int j = i + 1; j < size; j++)
        {
            for (int k = j + 1; k < size; k++)
            {
                int product = divisors[i] * divisors[j] * divisors[k];
                if (product == n && divisors[i] <= a && divisors[j] <= b && divisors[k] <= c)
                {
                    answer++;
                }
            }
        }
    }
    cout << answer << "\n";
    cout << divisors.size() << "\n";
}

int32_t main()
{
    int t;
    cin >> t;
    for (int i = 0; i < t; i++)
    {
        solve();
    }
    return 0;
}
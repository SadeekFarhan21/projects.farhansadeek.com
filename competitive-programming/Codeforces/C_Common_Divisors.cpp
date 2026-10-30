#include <bits/stdc++.h>
using namespace std;
#define int long long int

int countDivisors(int n)
{
    std::map<int, int> factors;

    while (n % 2 == 0)
    {
        factors[2]++;
        n /= 2;
    }

    for (int i = 3; i <= std::sqrt(n); i += 2)
    {
        while (n % i == 0)
        {
            factors[i]++;
            n /= i;
        }
    }

    if (n > 2)
    {
        factors[n]++;
    }

    int divisorsCount = 1;
    for (const auto &pair : factors)
    {
        divisorsCount *= (pair.second + 1);
    }

    return divisorsCount;
}

int32_t main()
{
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
        cin >> v[i];
    int x = v[0];
    for (int i = 0; i < n; i++)
    {
        x = __gcd(x, v[i]);
    }
    cout << countDivisors(x) << "\n";
    return 0;
}
#include <bits/stdc++.h>
using namespace std;
#define int long long

vector<pair<int, int>> primeFactorization(int n)
{
    vector<pair<int, int>> factors;

    int count = 0;
    while (n % 2 == 0)
    {
        count++;
        n /= 2;
    }
    if (count > 0)
        factors.push_back({2, count});

    for (int i = 3; i * i <= n; i += 2)
    {
        count = 0;
        while (n % i == 0)
        {
            count++;
            n /= i;
        }
        if (count > 0)
            factors.push_back({i, count});
    }

    if (n > 1)
    {
        factors.push_back({n, 1});
    }

    return factors;
}

int divisorSum(int n)
{
    vector<pair<int, int>> factors = primeFactorization(n);
    int sum = 1;
    for (auto &factor : factors)
    {
        int p = factor.first;
        int e = factor.second;
        int termSum = 0;
        for (int i = 0; i <= e; i++)
        {
            termSum += pow(p, i);
        }
        sum *= termSum;
    }
    return sum;
}

void solve(int n)
{
    int sum = divisorSum(n) - n;
    cout << sum << "\n";
}

int32_t main()
{
    int t;
    cin >> t;
    for (int i = 0; i < t; i++)
    {
        int n;
        cin >> n;
        solve(n);
    }
}
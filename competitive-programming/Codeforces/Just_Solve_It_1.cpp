#include <bits/stdc++.h>
using namespace std;
#define int long long int
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

int divisor_sum(int n)
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

int divisor_count(int n)
{
    vector<pair<int, int>> factors = primeFactorization(n);
    int count = 1;
    for (auto &factor : factors)
    {
        int e = factor.second;
        count *= (e + 1);
    }
    return count;
}

void solve(int n)
{
    vector<pair<int, int>> factors = primeFactorization(n);
    sort(factors.begin(), factors.end());
    // Least Prime Factor
    cout << factors[0].first << " ";
    // Greatest Prime Factor
    cout << factors[factors.size() - 1].first << " ";
    // Distinct Prime Factors
    cout << factors.size() << " ";
    // Total Prime Factors
    int total_prime = 0;
    for (auto x : factors)
    {
        total_prime += x.second;
    }
    cout << total_prime << " ";
    // Total Divisors
    cout << divisor_count(n) << " ";
    // Divisor Sum
    cout << divisor_sum(n) << "\n";
}

int32_t main()
{
    int n;
    cin >> n;
    for (int i = 0; i < n; i++)
    {
        int a;
        cin >> a;
        solve(a);
    }
    return 0;
}
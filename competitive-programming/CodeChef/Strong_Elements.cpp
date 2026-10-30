#include <bits/stdc++.h>
using namespace std;

const int N = 1e5 + 11;

void solve()
{
    long long n;
    cin >> n;

    vector<long long> v(n);
    for (long long &x : v)
    {
        cin >> x;
    }
    vector<long long> prefix_gcd(n), suffix_gcd(n);
    prefix_gcd[0] = v[0], suffix_gcd[n - 1] = v[n - 1];

    for (int i = 1; i < n; i++)
    {
        prefix_gcd[i] = __gcd(prefix_gcd[i - 1], v[i]);
    }

    for (int i = n - 2; i >= 0; i--)
    {
        suffix_gcd[i] = __gcd(suffix_gcd[i + 1], v[i]);
    }

    long long count = 0;

    for (int i = 0; i < n; i++)
    {
        if ((i == 0 && suffix_gcd[i + 1] != 1) || (i == n - 1 && prefix_gcd[i - 1] != 1) || (i > 0 && i < n - 1 && __gcd(prefix_gcd[i - 1], suffix_gcd[i + 1]) != 1))
        {
            count++;
        }
    }
    cout << count << "\n";
}

int main()
{
    ios_base::sync_with_stdio(false);
    cin.tie(NULL), cout.tie(NULL);

    int test;
    cin >> test;

    while (test--)
    {
        solve();
    }

    return 0;
}

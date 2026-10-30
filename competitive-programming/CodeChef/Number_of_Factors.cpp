#include <bits/stdc++.h>
using namespace std;

char prime[1000000] = {0};
int P[100000], k;

void sieve()
{
    P[k++] = 2;
    for (int i = 3; i * i < 1000000; i += 2)
    {
        if (!prime[i])
        {
            P[k++] = i;
            for (int j = i * i; j < 1000000; j += i + i)
                prime[j] = 1;
        }
    }
    for (int i = 1001; i < 1000000; i += 2)
        if (!prime[i])
            P[k++] = i;
}

void solve()
{
    map<long long, long long> m;
    long long n;
    cin >> n;
    for (int i = 0; i < n; ++i)
    {
        int a;
        cin >> a;
        for (int j = 0; j < k; ++j)
        {
            while (a > 1 && a % P[j] == 0)
            {
                a /= P[j];
                m[P[j]]++;
            }
        }
        if (a != 1)
        {
            m[a]++;
        }
    }
    long long int answer = 1;
    for (const auto &entry : m)
    {
        answer *= (entry.second + 1LL);
    }
    cout << answer << "\n";
}

int main()
{
    sieve();
    int t, n;
    std::map<int, int> m;
    cin >> t;
    for (int i = 0; i < t; i++)
    {
        solve();
    }
    return 0;
}

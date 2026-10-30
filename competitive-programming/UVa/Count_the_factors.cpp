#include <bits/stdc++.h>
using namespace std;
#define int long long

void solve(int n)
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

    cout << factors.size() << "\n";
    return;
}

int32_t main()
{
    int n;
    cin >> n;
    while (n != 0)
    {
        cout << n << " : ";
        solve(n);
        cin >> n;
    }
    return 0;
}
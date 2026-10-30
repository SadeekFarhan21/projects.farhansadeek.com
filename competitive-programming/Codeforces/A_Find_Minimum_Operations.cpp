#include <bits/stdc++.h>
using namespace std;

void solve()
{
    int n, k;
    cin >> n >> k;
    if (k == 1)
    {
        cout << n << "\n";
        return;
    }
    int operations = 0;
    while (n > 0)
    {
        operations += (n % k);
        n /= k;
    }
    cout << operations << "\n";
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
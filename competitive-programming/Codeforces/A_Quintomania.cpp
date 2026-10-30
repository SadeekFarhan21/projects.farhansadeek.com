#include <bits/stdc++.h>
using namespace std;
#define int long long int

void solve()
{
    int n;
    cin >> n;
    bool answer = true;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
    }

    for (int i = 0; i < n - 1; i++)
    {
        if (abs(v[i] - v[i + 1]) == 5 || abs(v[i] - v[i + 1]) == 7)
        {
            answer = answer & 1;
        }
        else
        {
            answer = answer & 0;
        }
    }
    if (answer == 0)
        cout << "NO" << "\n";
    else
        cout << "YES" << "\n";
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
#include <bits/stdc++.h>
using namespace std;
#define int long long

void solve()
{
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
    }
    vector<int> c = v;
    sort(c.begin(), c.end());
    int answer = 0;
    for (int i = 0; i < n; i++)
    {
        if (c[i] != v[i])
        {
            answer = gcd(answer, abs(c[i] - v[i]));
        }
    }
    cout << answer << "\n";
}

int32_t main()
{
    int t;
    cin >> t;
    for (int i = 0; i < t; i++)
    {
        solve();
    }
}
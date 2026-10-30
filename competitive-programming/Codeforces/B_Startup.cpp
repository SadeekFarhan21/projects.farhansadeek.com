#include <bits/stdc++.h>
using namespace std;
#define int long long int

void solve()
{
    int s, b;
    cin >> s >> b;
    vector<int> v(b + 1);
    fill(v.begin(), v.end(), 0);
    for (int i = 0; i < b; i++)
    {
        int x, y;
        cin >> x >> y;
        v[x] += y;
    }
    sort(v.rbegin(), v.rend());

    int sum = 0;
    for (int i = 0; i < min(s, b); i++)
    {
        sum += v[i];
    }
    cout << sum << "\n";
    return;
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
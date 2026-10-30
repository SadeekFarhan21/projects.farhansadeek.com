#include <bits/stdc++.h>
using namespace std;
#define int long long
int32_t main()
{
    freopen("lemonade.in", "r", stdin);
    freopen("lemonade.out", "w", stdout);

    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
    }
    sort(v.rbegin(), v.rend());
    vector<int> s;
    for (int i = 0; i < n; i++)
    {
        //         cout << s.size() << " " << v[i] << "\n";
        if (v[i] >= s.size())
        {
            s.push_back(v[i]);
        }
    }
    cout << s.size() << "\n";
    return 0;
}
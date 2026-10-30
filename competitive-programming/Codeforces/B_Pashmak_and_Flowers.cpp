#include <bits/stdc++.h>
using namespace std;

int32_t main()
{
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    if (v[0] == v[n - 1])
    {
        cout << 0 << " " << n * (n - 1) / 2 << "\n";
    }
    else
    {
        cout << v[n - 1] - v[0] << " " << count(v.begin(), v.end(), v[0]) * count(v.begin(), v.end(), v[n - 1]) << "\n";
    }
    return 0;
}
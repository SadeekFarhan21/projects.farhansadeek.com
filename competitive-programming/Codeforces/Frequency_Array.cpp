#include <bits/stdc++.h>
using namespace std;

int32_t main()
{
    int n, k;
    cin >> n >> k;
    vector<int> v(k + 1);
    for (int i = 0; i < n; i++)
    {
        int a;
        cin >> a;
        v[a]++;
    }
    for (int i = 1; i <= k; i++)
    {
        cout << v[i] << "\n";
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int32_t main()
{
    freopen("ctiming.in", "r", stdin);
    freopen("ctiming.out", "w", std);
    
    int d, h, m;
    cin >> d >> h >> m;
    cout << 1440 * (d - 11) + 60 * (h - 11) + (m - 11) << "\n";
    return 0;
}
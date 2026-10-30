#include <bits/stdc++.h>
using namespace std;
#define int long long int

int32_t main()
{
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
    }
    int count = 0;
    while (true)
    {
        for (int i = 0; i < n; i++)
        {
            if (v[i] & 1)
            {
                cout << count << '\n';
                return 0;
            }
            else
            {
                v[i] >>= 1;
            }
        }
        count++;
    }
}
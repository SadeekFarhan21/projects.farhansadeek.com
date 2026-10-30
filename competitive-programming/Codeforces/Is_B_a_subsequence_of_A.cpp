#include <bits/stdc++.h>
using namespace std;
#define int long long int

int32_t main()
{
    int a, b;
    cin >> a >> b;
    vector<int> v(a);
    vector<int> w(b);
    for (int i = 0; i < a; i++)
    {
        cin >> v[i];
    }
    for (int i = 0; i < b; i++)
    {
        cin >> w[i];
    }
    int i = 0, j = 0;
    while (i < a && j < b)
    {
        if (v[i] == w[j])
        {
            j++;
        }
        else
        {
            i++;
        }
    }
    if (j == b)
    {
        cout << "YES" << endl;
    }
    else
    {
        cout << "NO" << endl;
    }
    return 0;
}

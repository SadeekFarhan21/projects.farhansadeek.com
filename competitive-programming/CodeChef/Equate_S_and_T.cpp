#include <bits/stdc++.h>
using namespace std;
#define int long long

void solve()
{
    int n, m;
    cin >> n >> m;
    string s, t;
    cin >> s >> t;
    if (s == t)
    {
        cout << "Yes" << "\n";
        return;
    }

    int a1 = count(s.begin(), s.end(), 'a');
    int a2 = count(t.begin(), t.end(), 'a');
    int b1 = 0, b2 = 0;
    for (int i = 0; i < s.size(); i++)
    {
        if (s[i] == 'b')
        {
            b1++;
        }
        else
        {
            break;
        }
    }
    for (int i = 0; i < t.size(); i++)
    {
        if (t[i] == 'b')
        {
            b2++;
        }
        else
        {
            break;
        }
    }
    if (a1 != a2)
    {
        cout << "No" << "\n";
        return;
    }
    if (b1 != b2)
    {
        cout << "No" << "\n";
        return;
    }

    if (a1 == a2 && b1 == b2)
    {
        cout << "Yes" << "\n";
        return;
    }
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
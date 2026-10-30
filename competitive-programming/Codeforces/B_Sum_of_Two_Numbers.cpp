#include <bits/stdc++.h>
using namespace std;
#define int long long

void solve()
{
    string s;
    cin >> s;
    string n1, n2;
    reverse(s.begin(), s.end());
    int first = 1;
    int second = -1;
    for (int i = 0; i < s.size(); i++)
    {
        if ((s[i] - '0') % 2 != 0)
        {
            int x1 = ((s[i] - '0') + first) / 2;
            int x2 = ((s[i] - '0') + second) / 2;
            first *= -1;
            second *= -1;
            n1 += (x1 + '0');
            n2 += (x2 + '0');
        }
        else
        {
            int x1 = (s[i] - '0') / 2;
            int x2 = (s[i] - '0') / 2;
            n1 += (x1 + '0');
            n2 += (x2 + '0');
        }
    }
    reverse(n1.begin(), n1.end());
    reverse(n2.begin(), n2.end());
    cout << stol(n1) << " " << stol(n2) << "\n";
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
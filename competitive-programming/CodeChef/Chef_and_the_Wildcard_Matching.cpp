#include <bits/stdc++.h>
using namespace std;

void solve()
{
    string s1, s2;
    getline(cin, s1);
    getline(cin, s2);
    // cout << s1 << " " << s2 << "\n";
    for (int i = 0; i < max(s1.size(), s2.size()); i++)
    {

        if (s1[i] != '?' && s2[i] != '?' && s1[i] != s2[i])
        {
            cout << "No"
                 << "\n";
            return;
        }
    }
    cout << "Yes"
         << "\n";
}

int main()
{
    int n;
    cin >> n;
    for (int i = 0; i < n; i++)
    {
        solve();
    }
}
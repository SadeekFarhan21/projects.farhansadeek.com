#include <bits/stdc++.h>
using namespace std;
#define int long long int

bool contains_zero_five(string s)
{
    bool zero = false;
    bool five = false;
    for (int i = 0; i < s.size(); i++)
    {
        if (s[i] == '0')
        {
            zero = true;
        }
        else if (s[i] == '5')
        {
            five = true;
        }
    }
    return zero || five;
}

void solve()
{
    string s;
    cin >> s;
    if (!contains_zero_five(s))
    {
        cout << s.size() << "\n";
        return;
    }
    int option1, option2;
    reverse(s.begin(), s.end());
    int zero = INT_MAX, five = INT_MAX;

    // Look for 0
    for (int i = 0; i < s.size(); i++)
    {
        if (s[i] == '0')
        {
            zero = i;
            break;
        }
    }

    // Look for 5
    for (int i = 0; i < s.size(); i++)
    {s
        if (s[i] == '5')
        {
            five = i;
            break;
        }
    }

    // Case 0 : Look for 0 or 5
    int zero_five = INT_MAX;
    if (zero != INT_MAX)
    {
        for (int i = zero + 1; i < s.size(); i++)
        {
            if (s[i] == '0' || s[i] == '5')
            {
                zero_five = i;
                break;
            }
        }
        if (zero_five != INT_MAX)
        {
            option1 = zero_five;
        }
    }

    // Case 5 : Look for 2 or 7
    int two_seven = INT_MAX;
    if (five != INT_MAX)
    {
        for (int i = five + 1; i < s.size(); i++)
        {
            if (s[i] == '2' || s[i] == '7')
            {
                two_seven = i;
                break;
            }
        }
        if (two_seven != INT_MAX)
        {
            option2 = two_seven;
        }
    }
    // cout << option1 << " " << option2 << "\n";
    cout << min(option1, option2) << "\n";
}

int32_t main()
{
    int n;
    cin >> n;
    for (int i = 0; i < n; i++)
    {
        solve();
    }
}
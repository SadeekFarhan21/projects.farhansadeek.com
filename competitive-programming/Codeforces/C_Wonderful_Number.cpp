#include "bits/stdc++.h"
using namespace std;
#define int long long

int32_t main()
{
    int n;
    cin >> n;
    bitset<8> b(n);
    string s1 = b.to_string();
    s1.erase(0, s1.find_first_not_of('0'));
    string s2 = s1;
    reverse(s2.begin(), s2.end());
    if (n % 2 == 1 && s1 == s2)
    {
        cout << "YES" << "\n";
    }
    else
    {
        cout << "NO" << "\n";
    }
    // cout << s1 << " " << s2 << "\n";
    return 0;
}
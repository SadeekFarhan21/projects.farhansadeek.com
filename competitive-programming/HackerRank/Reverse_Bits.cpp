#include <bits/stdc++.h>
using namespace std;
#define int unsigned long long int
void solve(int n)
{
    bitset<32> b(n);
    string s = b.to_string();
    reverse(s.begin(), s.end());
    bitset<32> c(s);
    cout << c.to_ulong() << " ";
}

int32_t main()
{
    int n;
    cin >> n;
    for (int i = 0; i < n; i++)
    {
        int x;
        cin >> x;
        solve(x);
    }
}
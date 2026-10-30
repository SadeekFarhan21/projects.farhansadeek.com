#include <bits/stdc++.h>
using namespace std;
#define int long long
int32_t main()
{
    int n;
    cin >> n;
    set<int> numbers;
    for (int i = 0; i < n; i++)
    {
        int a;
        cin >> a;
        numbers.insert(a);
    }
    cout << numbers.size() << '\n';
    return 0;
}
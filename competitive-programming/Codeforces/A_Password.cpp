#include <bits/stdc++.h>
using namespace std;
#define int long long int

void solve()
{
    int n;
    cin >> n;
    vector<int> numbers;
    for (int i = 0; i < 10; i++)
    {
        numbers.push_back(i);
    }
    for (int i = 0; i < n; i++)
    {
        int a;
        cin >> a;
        numbers.erase(remove(numbers.begin(), numbers.end(), a), numbers.end());
    }
    cout << numbers.size() << "\n";
}

int32_t main()
{
    int t;
    cin >> t;
    for (int i = 0; i < t; i++)
    {
        solve();
    }
    return 0;
}
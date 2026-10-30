#include <bits/stdc++.h>
using namespace std;
#define int long long int

void solve()
{
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
    }
    vector<int> new_numbers;
    double sum = accumulate(v.begin(), v.end(), 0);
    int large = ceil(sum / n);
    int small = floor(sum / n);
    for (int i = 0; i < n; i++)
    {
        if ((i * small + (n - i) * large) == (int)sum)
        {
            for (int x = 0; x < i; x++)
            {
                new_numbers.push_back(small);
            }
            for (int x = 0; x < n - i; x++)
            {
                new_numbers.push_back(large);
            }
            break;
        }
    }
    /*
    for (auto x : new_numbers)
    {
        cout << x << " ";
    }*/
    for (int i = 0; i < n; i++)
    {
        for (int j = i + 1; j < n; j++)
        {
            sum += abs(new_numbers[i] - new_numbers[j]);
        }
    }
    cout << sum << "\n";
    // cout << large << " " << small << "\n";
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
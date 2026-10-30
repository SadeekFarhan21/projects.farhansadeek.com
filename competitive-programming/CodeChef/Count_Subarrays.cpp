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
    vector<int> count;
    int number = 1;
    for (int i = 0; i < n - 1; i++)
    {
        if (v[i] <= v[i + 1])
        {
            number++;
        }
        else
        {
            count.push_back(number);
            number = 1;
        }
    }
    count.push_back(number);
    int answer = 0;
    for (int i = 0; i < count.size(); i++)
    {
        answer += (count[i] * (count[i] + 1)) / 2;
    }
    cout << answer << endl;
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

// The number of subarrays for an array is n * (n + 1) / 2 where n is the length of the array.
// So, I found the number of subarrays for each increasing subarray and added them to get the answer.
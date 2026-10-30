#include <bits/stdc++.h>
using namespace std;
#define int long long int

void solve()
{
    int p, l;
    cin >> p >> l;
    int q = p - l;
    vector<int> answer;

    for (int i = 1; i * i <= q; i++)
    {
        if (q % i == 0)
        {
            if (i > l)
            {
                answer.push_back(i);
            }
            if (q / i > l && q / i != i)
            {
                answer.push_back(q / i);
            }
        }
    }

    sort(answer.begin(), answer.end());

    if (answer.empty())
    {
        cout << "impossible";
    }
    else
    {
        for (auto x : answer)
        {
            cout << x << ' ';
        }
    }
}

int32_t main()
{
    int t;
    cin >> t;
    for (int i = 1; i <= t; i++)
    {
        cout << "Case " << i << ": ";
        solve();
        cout << '\n';
    }
    return 0;
}

#include <bits/stdc++.h>
using namespace std;
int32_t main()
{
    freopen("cowqueue.in", "r", stdin);
    freopen("cowqueue.out", "w", stdout);
    int n;
    cin >> n;
    int timer = 0;
    vector<pair<int, int> > times;

    for (int i = 0; i < n; i++)
    {
        int a, b;
        cin >> a >> b;
        times.push_back({a, b});
    }
    sort(times.begin(), times.end());
    times.push_back({times[n - 1].first, times[n - 1].second});
    for (int i = 0; i < n; i++)
    {
        if (timer < times[i].first)
        {
            timer = times[i].first;
        }
        timer += times[i].second;
        // cout << timer << '\n';
        // cout << times[i].first << " " << times[i].second << '\n';
    }
    cout << timer << "\n";
    return 0;
}
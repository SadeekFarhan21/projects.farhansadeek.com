#include <bits/stdc++.h>
using namespace std;
#define int long long
int32_t main()
{
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    vector<pair<int, int> > counter;
    for (int i = 0; i < n; i++)
    {
        if (counter.empty() || counter.back().first != v[i])
        {
            counter.push_back({v[i], 1});
        }
        else
        {
            counter.back().second++;
        }
    }
    vector<pair<int, int> > prefixSum;
    prefixSum.push_back({0, 0});
    int cumulativeCount = 0;

    for (const auto &p : counter)
    {
        cumulativeCount += p.second;
        prefixSum.push_back({p.first, cumulativeCount});
    }
    int profit = prefixSum[1].first * (v.size() - prefixSum[0].second);
    int tuition = INT_MIN;
    for (int i = 1; i < prefixSum.size(); i++)
    {
        if (prefixSum[i].first * (v.size() - prefixSum[i - 1].second) > profit)
        {
            profit = prefixSum[i].first * (v.size() - prefixSum[i - 1].second);
            tuition = prefixSum[i].first;
        }
    }
    cout << profit << " " << tuition << '\n';
    return 0;
}
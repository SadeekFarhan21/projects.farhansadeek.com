#include <bits/stdc++.h>
using namespace std;

void solve()
{
    map<int, int> m;
    int n, d;
    cin >> n >> d;
    for (int i = 0; i < n; i++)
    {
        int a;
        cin >> a;
        m[a]++;
    }

    vector<int> a;
    for (auto x : m)
    {
        // cout << x.first << " " << x.second << "\n";
        if (x.second >= d)
        {
            a.push_back(x.first);
        }
    }

    if (a.size() == 0)
    {
        cout << -1;
        return;
    }

    int l = a[0], r = l;
    vector<pair<long long, pair<long long, long long>>> num;

    for (int i = 1; i < a.size(); i++)
    {
        if (a[i] != r + 1)
        {
            num.push_back({r - l + 1, {l, r}});
            l = r = a[i];   
        }
        else {
            r = a[i];
        }
    }
    num.push_back({r - l + 1, {l, r}});
    sort(num.rbegin(), num.rend());

    cout << num[0].second.first << " " << num[0].second.second;
}

int main()
{
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    cin >> n;
    for (int i = 0; i < n; i++)
    {
        solve(); cout << "\n";
    }

    return 0;
}

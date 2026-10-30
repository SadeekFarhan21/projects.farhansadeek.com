#include <bits/stdc++.h>

using namespace std;

typedef long long ll;

struct Train
{
    ll ti;
    int dir; // 0 for A2B, 1 for B2A
};

int main()
{
    int N;
    ll T;
    cin >> N >> T;
    vector<ll> tA, tB;
    for (int i = 0; i < N; ++i)
    {
        string s;
        ll ti;
        cin >> s >> ti;
        if (s == "A")
            tA.push_back(ti);
        else
            tB.push_back(ti);
    }
    sort(tA.begin(), tA.end());
    sort(tB.begin(), tB.end());
    int nA = tA.size(), nB = tB.size();
    int i = 0, j = 0;
    ll t = 0;
    ll delay = 0;
    while (i < nA || j < nB)
    {
        ll tA_next = (i < nA) ? tA[i] : LLONG_MAX;
        ll tB_next = (j < nB) ? tB[j] : LLONG_MAX;
        t = max(t, min(tA_next, tB_next));
        // Count number of trains ready to depart at time t
        int cntA = 0, cntB = 0;
        ll sumDelayA = 0, sumDelayB = 0;
        int idxA = i;
        while (idxA < nA && tA[idxA] <= t)
        {
            sumDelayA += t - tA[idxA];
            ++cntA;
            ++idxA;
        }
        int idxB = j;
        while (idxB < nB && tB[idxB] <= t)
        {
            sumDelayB += t - tB[idxB];
            ++cntB;
            ++idxB;
        }
        // Estimate future delay if the opposite group is delayed
        ll tA_future = (idxA < nA) ? tA[idxA] : LLONG_MAX;
        ll tB_future = (idxB < nB) ? tB[idxB] : LLONG_MAX;
        ll futureDelayA = 0, futureDelayB = 0;
        if (t + T < tA_future)
            futureDelayA = 0;
        else if (tA_future < LLONG_MAX)
            futureDelayA = (t + T - tA_future);
        if (t + T < tB_future)
            futureDelayB = 0;
        else if (tB_future < LLONG_MAX)
            futureDelayB = (t + T - tB_future);
        ll costA = sumDelayA + cntB * T + futureDelayB;
        ll costB = sumDelayB + cntA * T + futureDelayA;
        if (costA <= costB)
        {
            // Schedule group A
            delay += sumDelayA;
            i = idxA;
        }
        else
        {
            // Schedule group B
            delay += sumDelayB;
            j = idxB;
        }
        t += T;
    }
    cout << delay << endl;
    return 0;
}

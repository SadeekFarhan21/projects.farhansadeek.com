#include "bits/stdc++.h"
using namespace std;
#define int long long

void solve()
{
    int n, k;
    cin >> n >> k;
    vector<int> v(n);
    map<int, int> remainders;
    int product = 1;
    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
        v[i] %= k;
        remainders[v[i]]++;
    }

    if (k == 2 || k == 3 || k == 5)
    {
        if (remainders[0] >= 1)
        {
            cout << 0;
        }
        else
        {
            int max_remainder = *max_element(v.begin(), v.end());
            cout << k - max_remainder;
        }
    }
    else
    {
        if (remainders[2] >= 2 || remainders[0] >= 1)
        {
            cout << 0;
        }
        else if(remainders[3] >= 2){
            cout << 1;
        }
        else if(remainders[2] == 1 && remainders[3] == 1){
            cout << 1;
        }
        else if(remainders[2] == 1 && remainders[1] >= 1){
            cout << 1;
        }
        else if(remainders[3] == 1 && remainders[1] >= 1){
            cout << 1;
        }
        else if(remainders[1] >= 2){
            cout << 2;
        }
        else
        {
            int product = 1;
            for (int i = 0; i < n; i++)
            {
                v[i] = v[i] % k;
                product = (product * v[i]) % k;
            }
            if (product == 0)
            {
                cout << product;
            }
            else
            {
                cout << k - product;
            }
        }
    }
    cout << "\n";
}

int32_t main()
{
    int t;
    cin >> t;
    for (int i = 0; i < t; i++)
    {
        solve();
    }
}
#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main()
{
    ll n;
    cin >> n;
    vector<ll> v(n);
    for (ll i = 0; i < n; i++)
    {
        cin >> v[i];
    }

    ll even = 0;
    ll odd = 0;
    ll negative = 0;
    ll positive = 0;
    
    for (ll i = 0; i < n; i++)
    {
        if (v[i] % 2 == 0)
        {
            even++;
        }
        else
        {
            odd++;
        }
    }

    for (ll i = 0; i < n; i++)
    {
        if (v[i] < 0)
        {
            negative++;
        }
        else if(v[i] > 0)
        {
            positive++;
        }
    }

    cout << "Even: " << even << "\n";
    cout << "Odd: " << odd << "\n";
    cout << "Positive: " << positive << "\n";
    cout << "Negative: " << negative << "\n";
    return 0;
}
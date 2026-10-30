#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main(){
    ll n, t; cin >> n >> t;
    // cout << n << " " << t << " ";
    
    vector <ll> v(n);
    for(ll i = 0; i < n; i++){
        cin >> v[i];
        //cout << v[i] << " ";
    }

    vector <ll> sum(n + 1);
    sum[0] = 0;
    // cout << sum[0] << " ";
    for(ll i = 1; i <= n; i++){
        sum[i] = sum[i - 1] + v[i - 1];
        // cout << sum[i] << " ";
    }

    for(ll i = 0; i < t; i++){
        ll l, r; cin >> l >> r;
        cout << sum[r] - sum[l] << '\n';
    }
    return 0;
}
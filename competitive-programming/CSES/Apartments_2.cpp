#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int main(){
    ll n, m, k; cin >> n >> m >> k;
    vector <ll> a(n);
    vector <ll> b(m);

    for(ll i = 0; i < n; ++i){
        cin >> a[i];
    }

    for(ll i = 0; i < m; ++i){
        cin >> b[i];
    }

    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    
    ll count = 0;
    int i = 0, j = 0;
    while(i < n && j < m){
        if(abs(a[i] - b[j]) <= k){
            ++i; 
            ++j; 
            ++count;
        }
        else {
            if(a[i] - b[j] > k){
                ++j;
            }
            else {
                ++i;
            }
        }
    }
    cout << count << "\n";

    return 0;  
}

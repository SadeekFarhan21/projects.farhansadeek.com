#include <bits/stdc++.h>
using namespace std;
#define ll long long 

ll getAdd(ll x){
    ll m1 = 0, m2 = 9;
    while(x > 0){
        m1 = max(m1, x % 10);
        m2 = min(m2, x % 10);
        x /= 10;
    }
    return m1 * m2;
}

void solve(){
    ll a, k; cin >> a >> k;
    for(int i = 1; i < k; i++){
        ll y = getAdd(a);
        if(y == 0){
            break;
        }
        a += y;
    }
    cout << a << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
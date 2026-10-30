#include "bits/stdc++.h"
using namespace std;
#define int long long

void solve(){
    int a, b, n; cin >> a >> b >> n;
    map <int, int> m = {
        {0, a},
        {1, b},
        {2, a ^ b}
    };
    cout << m[n % 3] << "\n";
}

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
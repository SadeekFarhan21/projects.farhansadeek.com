#include <bits/stdc++.h>
using namespace std;

void solve(){
    int a, b, c, d, ans = 0; cin >> a >> b >> c >> d;
    if(a < b) ans += 1;
    if(a < c) ans += 1;
    if(a < d) ans += 1;
    cout << ans << endl;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
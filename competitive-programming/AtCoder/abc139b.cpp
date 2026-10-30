#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve(){
    int a, b; cin >> a >> b;
    if(b % a == 0) cout << b/a <<"\n"; else {
        cout << b / a + 1<<"\n";
    }  
}

int32_t main(){
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    solve();
}
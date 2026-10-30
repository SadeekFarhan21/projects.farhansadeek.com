#include <bits/stdc++.h>
using namespace std;

void solve(){
    double a; cin >> a; a /= 10;
    cout << 100 - 10 * (int) round(a) << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
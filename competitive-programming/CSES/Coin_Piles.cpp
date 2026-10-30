#include <bits/stdc++.h>
using namespace std;

void solve(){
    int a, b; cin >> a >> b;
    if((a + b) % 3 != 0 || max(a, b) / 2 > min(a, b)){
        cout << "NO" << "\n";
    } 
    else {
        cout << "YES" << "\n";
    }
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
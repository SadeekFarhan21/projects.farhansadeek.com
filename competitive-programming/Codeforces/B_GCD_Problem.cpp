#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    for(int i = 2; i <= n; i++){
        for(int j = 2; j <= n; j++){
            if(i + j + __gcd(i, j) == n){
                cout << i << " " << j << " " << __gcd(i, j) << "\n";
                return;
            }
        }
    }
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
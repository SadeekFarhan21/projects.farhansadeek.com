#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n, k; cin >> n >> k;
    for(int i = n - k; i >= 1; i--){
        cout << i << " ";
    }
    for(int i = n - k + 1; i <= n; i++){
        cout << i << " ";
    }
    cout << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
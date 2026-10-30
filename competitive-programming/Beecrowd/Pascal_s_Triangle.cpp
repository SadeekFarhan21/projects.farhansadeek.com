#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    cout << (long long) pow(2, n) - 1 << "\n";
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
    return 0;
}
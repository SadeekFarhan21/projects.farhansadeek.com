#include <bits/stdc++.h>
using namespace std;

unsigned long long sum(unsigned long long n){
    if(n == 1){
        return 1;
    }
    return n + sum(n / 2);
}

void solve(){
    unsigned long long n; cin >> n;
    if(n == 1){
        cout << 1 << "\n";
        return;
    }
    cout << n + sum(n / 2) << "\n";
    return;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
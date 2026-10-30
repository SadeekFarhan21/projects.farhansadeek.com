#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    int gcd = v[0];
    int count = 0;
    for(int i = 0; i < n; i++){
        gcd = __gcd(v[i], gcd);
    }
    for(int i = 0; i < n; i++){
        if(gcd != v[i]) count++;
    }
    cout << count << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
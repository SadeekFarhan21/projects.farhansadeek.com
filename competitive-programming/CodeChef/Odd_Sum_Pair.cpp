#include <bits/stdc++.h>
using namespace std;

void solve(){
    vector <int> v(3);
    int odd = 0, even = 0;
    for(int i = 0; i < 3; i++) cin >> v[i];
    for(int i = 0; i < 3; i++){
        if(v[i] % 2 == 0) even++;
        else odd++;
    }
    if(odd == 3 || even == 3) {
        cout << "NO" << "\n";
        return;
    }
    cout << "YES" << "\n";
    return;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
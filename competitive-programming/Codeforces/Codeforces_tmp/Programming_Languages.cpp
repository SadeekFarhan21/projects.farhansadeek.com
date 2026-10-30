#include <bits/stdc++.h>
using namespace std;

void solve(){
    vector <int> r(2), f(2), s(2);
    for(int i = 0; i < 2; i++){
        cin >> r[i];
    }
    for(int i = 0; i < 2; i++){
        cin >> f[i];
    }
    for(int i = 0; i < 2; i++){
        cin >> s[i];
    }
    sort(r.begin(), r.end());
    sort(f.begin(), f.end());
    sort(s.begin(), s.end());
    if((r[0] == f[0]) && (r[1] == f[1])){
        cout << 1 << "\n";
    }
    else if((r[0] == s[0]) && (r[1] == s[1])){
        cout << 2 << "\n";
    }
    else {
        cout << 0 << "\n";
    }
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
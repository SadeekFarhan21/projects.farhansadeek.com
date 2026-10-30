#include <bits/stdc++.h>
using namespace std;

void solve(){
    string s; cin >> s;
    if(s[1] == 'b') {
        cout << "YES" << "\n";
        return;
    }
    else if (s[1] == 'a'){
        if(s[0] == 'b') {
            cout << "YES" << "\n";
        }
        else {
            cout << "NO" << "\n";
        }
    }
    else {
        if(s[0] == 'a'){
            cout << "YES" << "\n";
        }
        else {
            cout << "NO" << "\n";
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
#include <bits/stdc++.h>
using namespace std;

void solve(){
    int k, n; cin >> k >> n;
    string s = "";
    vector <int> v(k);
    for(int i = 0; i < k; i++){
        s.push_back('0');
        cin >> v[i];
    }
    for(int i = 0; i < k; i++){
        if((n - v[i]) < 0){
            continue;
        }
        if((n - v[i]) >= 0){
            n -= v[i];
            s[i] = '1';
        }
    }
    cout << s << endl;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
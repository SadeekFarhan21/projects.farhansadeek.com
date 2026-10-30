#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n, k; cin >> n >> k;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    vector <int> w(v.begin(), v.end());
    sort(w.begin(), w.end());
    if(w == v){
        cout << "YES" << "\n";

    }
    else {
        if(k == 1){
            cout << "NO" << "\n";
        }
        else {
            cout << "YES" << "\n";
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
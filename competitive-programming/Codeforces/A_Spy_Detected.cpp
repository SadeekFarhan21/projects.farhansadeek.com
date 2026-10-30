#include "bits/stdc++.h"
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    unordered_set <int> s(v.begin(), v.end());
    for(auto x : s){
        if(count(v.begin(), v.end(), x) == 1){
            cout << 1 + distance(v.begin(), find(v.begin(), v.end(), x)) << "\n";
        }
    }
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
    return 0;
}
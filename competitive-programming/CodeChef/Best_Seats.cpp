#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double
void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    } 
    int minimum_cost = v[0] + v[1];
    int current_cost = v[0] + v[1];
    for(int i = 2; i < n; i++){
        current_cost = current_cost - v[i - 2] + v[i];
        minimum_cost = min(minimum_cost, current_cost);
    }
    cout << minimum_cost << "\n";
}

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
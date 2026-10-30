#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

void solve(){
    int n; cin >> n;
    vector <pair<int, int>> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i].first >> v[i].second;
    }
    sort(v.rbegin(), v.rend(), [](const pair<int, int> &a, pair <int, int> &b){
        if(a.first != b.first){
            return a.first > b.first;
        }
        else if(a.first == b.first) {
            return a.second < b.second;
        }
    });
    for(int i = 0; i < v.size(); i++){
        cout << v[i].first << " " << v[i].second << "\n";
    }
}

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
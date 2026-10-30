#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <pair<int, int>> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i].first;
    }

    for(int i = 0; i < n; i++){
        cin >> v[i].second;
    }
    vector <int> time(1000, 0);

    for(auto p : v){
        for(int i = p.first; i < p.second; i++){
            time[i] += 1;
        }
    }
    cout << *max_element(time.begin(), time.end()) << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
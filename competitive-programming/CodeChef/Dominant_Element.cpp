#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    map <int, int> m;
    for(int i = 0; i < n; i++){
        int x; cin >> x;
        m[x]++;
    }

    vector <int> max_count;
    for(auto x : m){
        max_count.push_back(x.second);
    }
    sort(max_count.rbegin(), max_count.rend());
    if(m.size() == 1 || max_count[0] != max_count[1]) cout << "YES" << "\n";
    else cout << "NO" << "\n";
    
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
    return 0;
}
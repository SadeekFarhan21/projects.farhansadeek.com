#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    map <int, int> m;
    for(int i = 0; i < n; i++){
        char a; cin >> a;
        m[a]++;
    }
    int answer = m.size() * 2;
    for(auto x : m){
        answer += x.second  - 1;
    }
    cout << answer << "\n";
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
}
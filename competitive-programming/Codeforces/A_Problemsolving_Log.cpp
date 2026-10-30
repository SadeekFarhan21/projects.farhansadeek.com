#include <bits/stdc++.h>
using namespace std;

map <char, int> m;

void solve(){
    map <char, int> c;
    int n; cin >> n;
    vector <char> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
        c[v[i]]++;
    }
    int count = 0;
    for(auto x : c){
        if(m[x.first] <= x.second) {
            count++;
        }
    }
    cout << count << "\n";
}

int main(){
    for(auto i = 'A'; i <= 'Z'; i++){
        m[i] =  (int) i - 'A' + 1;
    }

    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
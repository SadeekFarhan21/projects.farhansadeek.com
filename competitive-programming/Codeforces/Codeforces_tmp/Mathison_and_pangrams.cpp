#include <bits/stdc++.h>
using namespace std;

void solve(){
    map <char, int> m;
    for(char i = 'a'; i <= 'z'; i++){
        pair <char, int> p;
        p.first = i;
        int a; cin >> a;
        p.second = a;
    }
    string str; cin >> str;
    sort(str.begin(), str.end());
    set <char> s (str.begin(), str.end());
    for(int i = 0; i < s.size(); i++){
        if()
    }
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
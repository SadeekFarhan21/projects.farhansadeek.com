#include <bits/stdc++.h>
using namespace std;

void solve(){
    string s; cin >> s;
    if(s.size() >= 2){
        int last = s[s.size() - 1] - '0';
        int secondLast = s[s.size() - 2] - '0'; 
        // cout << secondLast << last << "\n";
        int number = secondLast * 10 + last;
        cout << number % 20 << "\n";
    }   
    else {
        cout << s << "\n";
    } 
}

int main(){
    long long t; cin >> t;
    for(long long i = 0; i < t; i++){
        solve();
    }
    return 0;
}
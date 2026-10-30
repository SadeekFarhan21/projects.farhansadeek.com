#include <bits/stdc++.h>
using namespace std;


void solve(){
    map <long long, long long> m;
    long long n; cin >> n;
    for(long long i = 0; i < n; i++){
        long long a; cin >> a;
        m[a]++;
    }
    for(auto x : m){
        if(x.second == 1){
            cout << x.first;
        }
    }
}

int main(){
    long long t; cin >> t;
    for(long long i = 0; i < t; i++){
        cout << "Case #" << i + 1 << ": "; solve();
        cout << "\n";
    }
    return 0;
}
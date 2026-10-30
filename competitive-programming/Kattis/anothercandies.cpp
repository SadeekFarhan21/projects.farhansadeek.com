#include <bits/stdc++.h>
using namespace std;

void solve(){
    long long n; cin >> n;
    vector <long long> v(n);
    for(long long i = 0; i < n; i++){
        cin >> v[i];
    }
    long long sum = accumulate(v.begin(), v.end(), 0);
    if(sum % n == 0){
        cout << "YES" << "\n";
    }
    else {
        cout << "NO" << "\n";
    }
}

int main(){
    long long t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
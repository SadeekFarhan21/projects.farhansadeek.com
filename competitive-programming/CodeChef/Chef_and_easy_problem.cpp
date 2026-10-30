#include <bits/stdc++.h>
using namespace std;

void solve(){
    long long n; cin >> n;
    vector <long long> v(n);
    for(long long i = 0; i < n; i++){
        cin >> v[i];
    }
    long long sum = 0;
    sort(v.rbegin(), v.rend());
    for(long long i = 0; i < n; i += 2){
        sum += v[i];
    }
    cout << sum << "\n";
}

int main(){
    long long t; cin >> t;
    for(long long i = 0; i < t; i++){
        solve();
    }
    return 0;
}
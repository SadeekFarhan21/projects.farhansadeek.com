#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    long long sum = accumulate(v.begin(), v.end(), 0);
    if(sum < 0){
        cout << "NO" << "\n";
    }
    else {
        cout << "YES" << "\n";
    }
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
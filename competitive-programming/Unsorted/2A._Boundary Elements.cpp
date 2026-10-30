#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    int element = v[0];
    int minimum = v[0];
    int count = 2;

    for(int i = 1; i < n; i++){
        if(v[i] <= minimum){
            minimum = v[i];
        }
        if(minimum == element){
            count++;
        }
    }

    element = v[n - 1];
    int maximum = v[n - 1];
    for(int i = n - 1; i >= 1; i--){
        if(v[i] >= maximum){
            maximum = v[i];
        }
        if(maximum == element){
            count++;
        }
    }
    cout << count << "\n";
}

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
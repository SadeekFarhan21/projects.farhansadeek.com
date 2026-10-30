#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n, k; cin >> n >> k;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.rbegin(), v.rend());
    int sum1 = 0;
    for(int i = 0; i < n - k; i++){
        sum1 += v[i];
        // cout << v[i] << " ";
    }
    int sum2 = 0;
    for(int i = n - k; i < n ; i++){
        sum2 += v[i]; // cout << v[i] << " ";
    }
    cout << abs(sum1 - sum2) << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
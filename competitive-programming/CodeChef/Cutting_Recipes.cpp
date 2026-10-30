#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    int answer = v[0];
    for(int i = 1; i < n; i++){
        answer = __gcd(answer, v[i]);
    }
    for(int i = 0; i < n; i++){
        cout << v[i] / answer << " ";
    }
    cout << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n, x; cin >> n >> x; 
    vector <int> v(n + 2);
    v[0] = 0;
    for(int i = 1; i <= n; i++){
        cin >> v[i]; 
    }
    v[n + 1] = x;
    int answer = 2 * (v[n + 1] - v[n]);
    for(int i = 1; i <= n; i++){
        answer = max(answer, v[i] - v[i - 1]);
    }
    cout << answer << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
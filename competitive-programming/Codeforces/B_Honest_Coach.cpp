#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    int answer = INT_MAX;
    for(int i = 1; i < n; i++){
        answer = min(answer, v[i] - v[i- 1]);
    }
    cout << answer << "\n";
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
}
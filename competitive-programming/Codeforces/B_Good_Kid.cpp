#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++) cin >> v[i];
    sort(v.begin(), v.end());
    int product = 1;
    int answer = INT_MIN;
    if(v[0] == 0) {
        for(int i = 1; i < n; i++){
            product *= v[i];
        }
        cout << product << "\n";
        return;
    }
    else {
        for(int i = 0; i < n; i++){
            product *= v[i];
        }
        for(int i = 0; i < n; i++){
            product /= v[i];
            answer = max(answer, product * (v[i] + 1));
        }
    }
    cout << answer << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
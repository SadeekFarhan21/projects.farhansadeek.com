#include <bits/stdc++.h>
using namespace std;

void solve(){
    int a, b, c; cin >> a >> b >> c;
    cout << max(0, max(b, c) + 1 - a) << " ";
    cout << max(0, max(a, c) + 1 - b) << " ";
    cout << max(0, max(b, a) + 1 - c);
    cout << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
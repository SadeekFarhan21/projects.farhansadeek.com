#include <bits/stdc++.h>
using namespace std;
#define int long long

void solve(){
    int x, n; cin >> x >> n;
    // Make the vector
    vector <int> v(11);
    v[0] = 0;
    for(int i = 1; i <= 10; i++){
        if(i % 2 == 0){
            v[i] = -1 * x;
        }
        else {
            v[i] = x;
        }
    }
    int answer = 0;
    for(int i = 1; i <= n; i++){
        answer += v[i];
    }
    cout << answer << "\n";
}

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
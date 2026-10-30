#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve(){
    int sum = 0;
    map <int, int> m;
    for(int i = 1; i <= 9; i++){
        for(int j = 1; j <= 9; j++){
            sum += (i * j);
            m[i * j] += 1;
        }
    }    
    int a; cin >> a;
    cout << sum - a * m[a] << "\n";
}

int32_t main(){
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
        solve();
}
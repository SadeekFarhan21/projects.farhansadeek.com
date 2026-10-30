#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        int n; cin >> n;
        vector <int> v(n);
        for(int j = 0; j < n; j++){
            cin >> v[j];
        }
        
        int ans = 0;
        int cur_max = 0;
        
        for(auto x : v){
            if(x < cur_max){
                ans++;
            } else {
                cur_max = x;
            }
        }
        
        cout << ans << endl;
    }
}
#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main(){
    int t; cin >> t;
    while(t--){
        int x, y; cin >> x >> y;
        int bob = (y - x) / 2;
        int alice = y - bob;
        cout << alice << " " << bob << "\n";
    }
    return 0;
}
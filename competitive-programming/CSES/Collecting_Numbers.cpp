#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main(){
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n; cin >> n;
    int a, b, count = 0; cin >> a;
    for(int i = 0; i < n; i++){
        cin >> b;
        if(b < a){
            count += 1;
        }
        a = b;
    }
    cout << count << "\n";
    return 0;
}
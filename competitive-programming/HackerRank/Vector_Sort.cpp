#include "bits/stdc++.h"
using namespace std;
#define int long long 
#define double long double

int32_t main(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    for(int i = 0; i < n; i++){
        cout << v[i] << " ";
    }
    cout << "\n";
    return 0;
}
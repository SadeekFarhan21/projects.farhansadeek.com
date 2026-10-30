#include "bits/stdc++.h"
using namespace std;
#define int long long

int32_t main(){
    int n; cin >> n;
    vector <int> a(n);
    for(int i = 0; i < n; i++){
        cin >> a[i];
    }
    int right_most = a[0] - 1;
    // cout << right_most << "\n";
    for(int i = 0; i < n && i <= right_most; i++){
        right_most = max(right_most, i + a[i] - 1);
        if(right_most >= n - 1){
            right_most = n - 1;
        }
    }
    cout << right_most + 1 << "\n";
}
#include "bits/stdc++.h"
using namespace std;

const int mx = 2e5+123;
int v[mx], sum[mx];

int main(){
    int n, q; cin >> n >> q;
    for(int i = 1; i <= n; i++){
        cin >> v[i];
    }
    for(int i = 1; i <= n; i++){
        sum[i] = sum[i - 1] ^ v[i];
    }
    for(int i = 0; i < q; i++){
        int l, r; cin >> l >> r;
        cout << (sum[r] ^ sum[l - 1]) << "\n";
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, q; cin >> n >> q;
    vector <int> v(n);
    vector <int> sum(n + 1);
    for(int i = 0; i < n; i++) cin >> v[i];
    sum[0] = 0;
    for(int i = 1; i <= n; i++){
        sum[i] = sum[i - 1] + v[i];
    }
    for(int i = 0; i < q; i++){
        int a, b; cin >> a >> b;
        cout << sum[b] - sum[a] << "\n";
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    int x, n; cin >> n >> x;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    vector <int> sum(n);
    sum[0] = v[0];
    for(int i = 1; i < n; i++){
        sum[i] = sum[i - 1] + v[i];
        if(sum[i] > x){
            cout << i << "\n";
            return 0;
        }
    }
    cout << n << "\n";
    return 0;
}
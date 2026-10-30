#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, x; cin >> n >> x;
    vector <int> v(n);
    vector <int> sum(n + 1);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    for(int i = 1; i <= n; i++){
        sum[i] = sum [i - 1] + v[i - 1];
    }
    map <int, int> count;
    for(int l = 1; l <= n; l++){
        for(int r = l; r <= n; r++){
            count[sum[r] - sum[l - 1]]++;
        }
    }
    cout << count[x] << "\n";
    return 0;
}
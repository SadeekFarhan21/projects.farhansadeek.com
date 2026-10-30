#include <bits/stdc++.h>
using namespace std;

void solve(int n){
    vector <int> v(n + 1, 0);
    for(int i = 1; i <= n; i++){
        v[i] = v[i - 1] + i * i;
    }
    cout << v[n] << "\n";
}

int main(){
    while(true){
        int n; cin >> n;
        if(n == 0){
            break;
        }
        solve(n);
    }
    return 0;
}
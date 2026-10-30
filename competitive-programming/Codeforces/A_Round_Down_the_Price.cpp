#include <bits/stdc++.h>
using namespace std;

int pow(int a, int b){
    int result = 1;
    for(int i = 0; i < b; i++){
        result *= a;
    }
    return result;
}

void solve(){
    int n; cin >> n;
    for(int i = 0; i < 100; i++){
        if(pow(10, i) == n){
            cout << 0 << "\n";
            break;
        }
        else if(pow(10, i) < n && n < pow(10, i + 1)) {
            cout << n - pow(10, i) << "\n";
            break;
        }
    }
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
    return 0;
}
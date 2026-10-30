#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    int x = 1, y = 2, z = n - 3;
    if(z % 3 == 0){
        y += 2;
        z -= 2;
    }
    if(z % 3 == 0){
        cout << "NO" << "\n";
    }
    else {
        if(x != y && y != z && x != z && x >= 1 && y >= 1 && z >= 1){
            cout << "YES" << "\n";
            cout << x << " " << y << " " << z << "\n";
        }
        else {
            cout << "NO" << "\n";
        }
    }
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
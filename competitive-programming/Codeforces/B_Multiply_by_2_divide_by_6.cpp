#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    if(n == 1){
        cout << 0 << "\n";
        return;
    }
    int two = 0, three = 0;
    while(n != 1 && n % 2 == 0){
        two++;
        n /= 2;
    }

    while(n != 1 && n % 3 == 0){
        three++;
        n /= 3;
    }
    // cout << "n = " << n << "\n";
    if(n != 1 || two > three){
        cout << -1 << "\n";
        return;
    }
    cout << max(two, three) + abs(two - three) << "\n";
    return;
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
    return 0;
}
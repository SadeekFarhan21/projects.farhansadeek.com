#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, k, ans; cin >> n >> k;
    /*
    // Algorithm 1
    int time = 240 - k, need = 0, ans = 0;
    for(int i = 1; i <= n; i++){
        need += i * 5;
        if(need <= time){
            ans += 1;
        }
        else {
            break;
        }
    }
    */

    // Algorithm 2
    
    for(int i = n; i >= 0; i--){
        if((5 * i * (i - 1)) <= (240 - k)){           
            ans = i;
        }
    }

    cout << ans << "\n";
    return 0;
}
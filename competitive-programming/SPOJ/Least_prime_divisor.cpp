#include <bits/stdc++.h>
using namespace std;

int solve(int n){
    if(n % 2 == 0){
        return 2;
    }
    for(int i = 3; i * i <= n; i++){
        if(n % i == 0){
            return i;
        }
    }
    return n;
}

int main(){
    int n; cin >> n;
    while(n != 0){
       cout << solve(n) << "\n";
       cin >> n;
    }
    return 0;
}
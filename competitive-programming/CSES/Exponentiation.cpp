#include <bits/stdc++.h>
using namespace std;
const int MOD = 1000000007;


long long power(long long a, long long b){
    long long result = 1;
    a %= MOD;
    while(b > 0){
        if(b % 2 == 1){
            result = (result * a) % MOD;
        }

        b = b / 2;
        a = (a * a) % MOD;
    }   
    return result;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        int a, b, c; cin >> a >> b >> c;
        cout << power(a, b) << "\n";
    }
    return 0;
}
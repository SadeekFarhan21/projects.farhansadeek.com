#include "bits/stdc++.h"
using namespace std;
#define int long long

int32_t main(){
    int a, b, c; 
    cin >> a >> b >> c;
    if(a % c == 0){
        cout << a << "\n";   
    }
    else if(b % c == 0){
        cout << b << "\n";
    }
    else {
        int divisor = (a / c) + 1;
        int expected = divisor * c;
        if(expected > b){
            cout << -1 << "\n";
        }
        else {
            cout << expected << "\n";
        }
    }
    return 0;
}   

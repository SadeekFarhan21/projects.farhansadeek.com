#include "bits/stdc++.h"
using namespace std;
#define int long long 

int xor_(int n){
    int remainder = n % 4;
    if(remainder == 0){
        return n;
    }
    else if(remainder == 1){
        return 1;
    }
    else if(remainder == 2){
        return n + 1;
    }
    else {
        return 0;
    }
}
int32_t main(){
    int a, b; cin >> a >> b;
    int x = xor_(a - 1);
    int y = xor_(b);
    int answer = x ^ y;
    cout << answer << "\n";
    return 0;
}
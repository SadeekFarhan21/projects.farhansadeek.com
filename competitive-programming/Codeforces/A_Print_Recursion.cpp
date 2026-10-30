#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

void recursion(int n){
    if(n == 0){
        return;
    }
    cout << "I love Recursion\n";
    recursion(n - 1);
}

int32_t main(){
    int n; cin >> n;
    recursion(n);   
    return 0;    
}
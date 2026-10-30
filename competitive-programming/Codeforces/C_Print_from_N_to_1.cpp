#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

void recursion(int n){
    cout << n;
    if(n == 1){
        return;
    }
    cout << " ";
    recursion(n - 1);
}
int32_t main(){
    int n; cin >> n; recursion(n);
    return 0;   
}
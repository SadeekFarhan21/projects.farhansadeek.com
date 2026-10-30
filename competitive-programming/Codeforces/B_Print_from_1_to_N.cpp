#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

void recursion(int n, int limit){
    cout << n << "\n";
    if(n == limit){
        return;
    }
    recursion(n + 1, limit);
}
int32_t main(){
    int n; cin >> n;
    recursion(1, n);
    return 0;
}
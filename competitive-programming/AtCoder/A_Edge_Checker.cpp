#include "bits/stdc++.h"
using namespace std;

int32_t main(){
    int a, b; cin >> a >> b;
    if(abs(a - b) == 1 || (a == 10 && b == 1) || (a == 1 && b == 10)){
        cout << "Yes\n";
        return 0;
    }
    cout << "No\n";
    return 0;
}
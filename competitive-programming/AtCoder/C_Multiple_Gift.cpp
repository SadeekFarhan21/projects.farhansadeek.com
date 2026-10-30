#include "bits/stdc++.h"
using namespace std;
#define int long long
int32_t main(){
    int a, b; cin >> a >> b;
    int answer = 0;
    while(a <= b){
        answer += 1;
        a *= 2;
    }
    cout << answer << '\n';
    return 0;
}
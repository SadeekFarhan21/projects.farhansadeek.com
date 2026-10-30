#include <bits/stdc++.h>
using namespace std;
#define ll long long

ll factorial(int n){
    if(n == 1){
        return 1;
    }
    return n * factorial(n - 1);
}

int main(){
    ll a; cin >> a;
    cout << factorial(a) << "\n";
}
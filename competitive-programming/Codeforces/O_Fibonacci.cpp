#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main(){
    vector<ll>fib(51);
    fib[0] = 0;
    fib[1] = 1;
    for (ll i = 2; i <= 50; i++){
        fib[i] = fib[i - 1] + fib[i - 2];
    }
    ll n;
    cin >> n;
    cout << fib[n - 1] << "\n";
    return 0;
}
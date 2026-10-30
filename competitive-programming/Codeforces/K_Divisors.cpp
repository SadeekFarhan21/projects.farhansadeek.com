#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main()
{
    ll n;
    cin >> n;
    set<ll> s;
    for (int i = 1; i <= sqrt(n); i++){
        if(n % i == 0){
            s.insert(n / i);
            s.insert(i);
        }
    }
    for(auto x : s){
        cout << x << "\n";
    }
    return 0;
}
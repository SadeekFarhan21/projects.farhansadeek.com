#include <bits/stdc++.h>
using namespace std;
using ll = long long;


int main(){
    ll n, t; cin >> n >> t;
    ll days[n];
    ll bales[n];
    for(ll i = 0; i < n; i++){
        cin >> days[i] >> bales[i];
    }

    ll currHay = 0;
    ll eaten = 0;

    for(ll i = 0; i < n - 1; i++){
        currHay += days[i];
        eaten += min(currHay, days[i + 1] - days[i]);
        currHay += min(currHay, days[i + 1] - days[i]);    
    }

    currHay += bales[n - 1];
    eaten += min(currHay, t - days[n - 1] + 1);
    cout << eaten << "\n"

}
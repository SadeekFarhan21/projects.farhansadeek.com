#include <bits/stdc++.h>


using namespace std;
#define ll long long

int main(){
    ll n; cin >> n;
    if(n == 2 || n == 3) {
        cout << "NO SOLUTION" << "\n";
        return 0;
    }
    vector <int> odd;
    vector <ll> even;
    for(ll i = 1; i <= n; i += 2){
        odd.push_back(i);
    }
    for(ll i = 2; i <= n; i += 2){
        even.push_back(i);
    }
    
    for(auto x : even) cout << x << " ";
    for(auto x : odd) cout << x << " ";
    
    return 0;
}
#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main(){
    ll n; cin >> n;
    vector <pair<ll, ll>> v(n);
    vector <int> init(n);
    vector <int> fin(n);
    string rated = "unrated";
    for(ll i = 0; i < n; i++){
        cin >> v[i].first >> v[i].second;
        init[i] = v[i].first;
        fin[i] = v[i].second;
    }

    for(ll i = 0; i < n; i++){
        if(v[i].first != v[i].second){
            cout << "rated" << "\n";
            return 0;
        }
    }
    sort(init.rbegin(), init.rend());
    for(int i = 0; i < n; i++){
        if(init[i] == fin[i]){
            continue;     
        }
        else {
            cout << "unrated" << "\n";
            return 0;
        }
    }
    cout << "maybe" << "\n";
    return 0;
}
#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

void solve() {
    int n;
    cin >> n;
    vector<int> odds, evens;
    for(int i = 0; i < n; i++) {
        int x;
        cin >> x;
        if(x % 2 == 0){
            odds.push_back(x);
        }
        else {
            evens.push_back(x);
        }
    }
    
    sort(odds.rbegin(), odds.rend());
    sort(evens.rbegin(), evens.rend());
    
    vector<int> pref(evens.size() + 1, 0);
    for(int i = 0; i < evens.size(); i++) {
        pref[i + 1] = pref[i] + evens[i];
    }
    
    for(int k = 1; k <= n; k++) {
        if(odds.empty()) {
            cout << 0 << " ";
            continue;
        }
        
        int take_e = min(k - 1, (int) evens.size());
        int take_o = k - take_e;
        
        if(take_o % 2 == 0) {
            take_e--;
            take_o++;
        }
        
        if(take_e < 0 || take_o > odds.size()) {
            cout << 0 << " ";
        } else {
            cout << odds[0] + pref[take_e] << " ";
        }
    }
    cout << "\n";
}

int32_t main() {
    ios_base::sync_with_stdio(0); cin.tie(0);
    int t; cin >> t;
    for(int i = 0; i < t; i++) {
        solve();
    }
    
    return 0;
}
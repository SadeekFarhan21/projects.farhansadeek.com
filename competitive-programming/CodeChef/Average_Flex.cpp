#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    int count = 0;
    for(int i = 0; i < n; i++){
        int low = lower_bound(v.begin(), v.end(), v[i]) - v.begin();
        int high = v.end() - upper_bound(v.begin(), v.end(), v[i]);
        if(low >= high) count++;
    }
    cout << count << "\n";
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
    return 0;
}
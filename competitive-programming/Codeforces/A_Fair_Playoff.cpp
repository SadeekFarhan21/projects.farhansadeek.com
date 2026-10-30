#include <bits/stdc++.h>
using namespace std;


void solve(){
    vector <int> v(4);
    for(int i = 0; i < 4; i++){
        cin >> v[i];
    }
    vector <int> val1 = {max(v[0], v[1]), max(v[2], v[3])};
    std::sort(v.rbegin(), v.rend());
    vector <int> val2(v.begin(), v.begin() + 2);
    sort(val2.begin(), val2.end());
    sort(val1.begin(), val1.end());

    if(val1[0] == val2[0] && val1[1] == val2[1]) cout << "YES" << "\n";
    else cout << "NO" << "\n";
    return;
}

int main(){
    int n; cin >> n;
    while(n--){
        solve();
    }
    return 0;
}
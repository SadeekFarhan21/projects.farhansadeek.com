#include <bits/stdc++.h>
using namespace std;

map <string, int> m;

int main(){
    int t, n; cin >> t >> n;
    
    for(int i = 0; i < t; i++){
        vector <string> v(n);
        for(int j = 0; j < n; j++){
            cin >> v[j];
        }
        set <string> s (v.begin(), v.end());
        for(auto x : s){
            m[x]++;
        }
    }
    vector <string> ans;
    for(auto x : m){
        if(x.second == t){
            ans.push_back(x.first);
        }
    }
    cout << ans.size() << "\n";
    for(int i = 0; i < ans.size(); i++){
        cout << ans[i] << "\n";
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    freopen("citystate.in", "r", stdin);
    freopen("citystate.out", "w", stdout);

    int n; cin >> n;
    map <string, string> m;
    for(int i = 0; i < n; i++){
        string city, state; cin >> city >> state;
        m.insert({city.substr(0, 2), state});
    }
    int count = 0;
    // for(auto s : m) cout << s.first << " " << s.second << "\n";
    for(auto i : m){
        for(auto j : m){
            if((i.first == j.second && j.first == i.second) && (i.first != j.first && i.second != j.second)){
                count++;
            }
        }
    }
    cout << count / 2 << "\n";
    return 0;
}
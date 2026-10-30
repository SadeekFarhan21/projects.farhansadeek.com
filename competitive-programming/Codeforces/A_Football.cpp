#include <bits/stdc++.h>
using namespace std;

int main(){
    map <string, int> m;
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        string a; cin >> a;
        m[a]++;
    }
    if(m.size() == 1){
        for(auto x : m) cout << x.first << "\n";
    }
    else {
        int answer = 0;
        for(auto x : m){
            answer = max(answer, x.second);
        }
        for(auto x : m){
            if(x.second == answer){
                cout << x.first;
            }
        }
        cout << "\n";
    }
    return 0;
}
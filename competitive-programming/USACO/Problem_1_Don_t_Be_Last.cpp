#include <bits/stdc++.h>
using namespace std;

int main(){
    
    freopen("notlast.in", "r", stdin);
    freopen("notlast.out", "w", stdout);
    
    int n; cin >> n;
    map <string, int> m;
    for(int i = 0; i < n; i++){
        string name; cin >> name;
        int value; cin >> value;
        m[name] += value;
    }
    vector <int> v;
    set <int> s;
    for(auto x : m){
        s.insert(x.second);
        v.push_back(x.second);
    }
    sort(v.begin(), v.end());
    if(s.size() >= 2){
        int second = *next(s.begin(), 1);
        if(count(v.begin(), v.end(), second) >= 2){
            cout << "Tie" << "\n";
        }
        else {
            for(auto x : m){
                if(x.second == second){
                    cout << x.first << "\n";
                    
                }
            }
        }
        return 0;
    }
    cout << "Tie" << "\n";
    return 0;
}
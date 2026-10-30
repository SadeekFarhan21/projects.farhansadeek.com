#include <bits/stdc++.h>
using namespace std;

map <string, int> m;

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        string s; cin >> s;
        m[s]++;
    }
    int min = INT_MAX;
    for(auto x : m){
        if(min > x.second){
            min = x.second;
        }
    }
    for(auto x : m){
        // cout << x.first << " " << x.second << "\n"; 
        if(x.second == min){
            cout << x.first << "\n";
        }
    }
    return 0;
}
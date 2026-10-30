#include <bits/stdc++.h>
using namespace std;

int main(){
    map <string, int> m;
    string s;
    vector <string> v;
    priority_queue <string> pq;
    while(!cin.eof()){
        string f, l; cin >> f >> l;
        v.push_back(f + " " + l);   
        m[f]++;     
    }
    
    vector <string> ans;
    for(auto x : m){
        if(x.second == 1){
            ans.push_back(x.first);
        }
        else {
            for(int i = 0; i < v.size(); i++){
                if(v[i].find(x.first) != string::npos){
                    ans.push_back(v[i]);
                }
            }
        }
        
    }
    for(auto x : ans){
        cout << x << "\n";
    }
}
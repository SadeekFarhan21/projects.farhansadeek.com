#include <bits/stdc++.h>
using namespace std;

map <string, int> m;

bool isConvertibleToInt(string s){
    bool result = false;
    try {
        stoi(s);
        result = true;
    } catch(string s){

    }
    return result;
}


void solve(string s){
    /*
    int sum = 0;
    istringstream ss(s);
    string del;
    vector <string> v;
    while(getline(ss, del, ' ')){
        v.push_back(del);
    }
    // def
    if(v[0] == "def"){
        m.insert({v[1], stoi(v[2])});
        return;
    }

    // clear
    else if(v[0] == "clear"){
        m.clear();
        return;
    }
    
    // calc
    else if(v[0] == "calc"){
        string answer = "unknown";
        for(int i = 1; i < v.size(); i++){
            if(v[i] == "+"){
                i++;
                cout << v[i] << " " << m[v[i]];
            }
            else if(v[i] == "-"){
                i++;
                cout << v[i] << " " << m[v[i]];
            }
        }
    }
    cout << "\n";
    // cout << sum << "\n";
    */
}

int main(){
    string s;
    while(getline(cin, s)){
        solve(s);
    }
    for(auto x : m){
        cout << x.first << " " << x.second << "\n";
    }
    return 0;
}   
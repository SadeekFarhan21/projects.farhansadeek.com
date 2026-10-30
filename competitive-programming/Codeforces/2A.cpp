#include <bits/stdc++.h>
using namespace std;

int main(){
    string e1, p1, e2;
    getline(cin, e1);
    getline(cin, p1);
    getline(cin, e2);
    map <char, char> m;
    for(int i = 0; i < e1.size(); i++){
        m.insert({e1[i], p1[i]});
    }
    
    for(int i = 0; i < e2.size(); i++){
        cout << m[e2[i]];
    }
    cout << "\n";
}
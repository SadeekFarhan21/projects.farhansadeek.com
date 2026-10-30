#include <bits/stdc++.h>
using namespace std;

int main(){
    int p, n; cin >> p >> n;
    set <string> s;
    for(int i = 0; i < n; i++){
        string str; cin >> str;
        s.insert(str);
        if(s.size() == p){
            cout << i + 1 << "\n";
            return 0;
        }    
    }
    cout << "paradox avoided" << "\n";
    return 0;
}
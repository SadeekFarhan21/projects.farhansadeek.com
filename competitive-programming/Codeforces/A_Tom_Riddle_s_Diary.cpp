#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main(){
    int n; cin >> n;
    set <string> s;
    for(int i = 0; i < n; i++){
        string name; cin >> name;
        int size = s.size();
        s.insert(name);
        if(s.size() == size){
            cout << "YES\n";
        }
        else {
            cout << "NO\n";
        }   
    }
    return 0;
}
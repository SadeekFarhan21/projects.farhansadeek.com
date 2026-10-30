#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    vector <int> v(n + 1);
    for(int i = 1; i <= n; i++){
        cin >> v[i];
    }
    bool found = false;
    for(int i = 1; i <= n; i++){
        if(v[v[v[i]]] == i){
            found = true;
        }
    }
    if(found) cout << "YES" << "\n";
    else couz
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    int local = v[0];
    int global = v[0];
    for(int i = 0; i < n; i++){
        local = max(v[i], local + v[i]);
        global = max(global, local);
    }
    cout << global << "\n";
}
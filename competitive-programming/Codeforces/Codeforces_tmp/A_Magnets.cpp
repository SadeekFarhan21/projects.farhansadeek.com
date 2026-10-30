#include <bits/stdc++.h>
using namespace std;

int main(){
    int t; cin >> t;
    vector <string> v(t);
    int ans = 0;
    for(int i = 0; i < t; i++){
        cin >> v[i];
    }
    for(int i = 0; i < t; i++){
        if(v[i] != v[i + 1]){
            ans += 1;
        }
    }
    cout << ans << endl;
    return 0;
}
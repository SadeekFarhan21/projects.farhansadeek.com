#include <bits/stdc++.h>
using namespace std;

int main(){
    int s; cin >> s;
    vector <int> v(12);
    for(int i = 0; i < 12; i++){
        cin >> v[i];
    }
    sort(v.rbegin(), v.rend());
    int sum = 0;
    if(s == 0) {
        cout << 0 << endl;
        return 0;
    }

    for(int i = 0; i < 12; i++){
        sum += v[i];
        if(sum >= s){
            cout << i + 1 << "\n";
            return 0;
        }
    }
    cout << -1 << "\n";
    return 0;
}
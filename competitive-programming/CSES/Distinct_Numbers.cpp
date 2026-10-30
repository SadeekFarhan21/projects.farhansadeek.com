#include <bits/stdc++.h>
using namespace std;

int main(){
    int s; cin >> s;
    vector <int> v(s);
    for(int i = 0; i < s; i++){
        cin >> v[i];
    }
    set <int> x(v.begin(), v.end());
    cout << x.size() << "\n";
    return 0;
}
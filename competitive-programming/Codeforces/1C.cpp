#include <bits/stdc++.h>
using namespace std;

int main(){
    map <int, char> m;
    for(int i = 'A'; i <= 'Z'; i++){
        m.insert({(int) i - 64, i});
    }
    int a, b; cin >> a >> b;
    cout << m[a] << m[b] << m[a];
    return 0;
}
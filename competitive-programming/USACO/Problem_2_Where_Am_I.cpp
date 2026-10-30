#include <bits/stdc++.h>
using namespace std;

int main(){
    // freopen("whereami.in", "r", stdin);
    // freopen("whereami.out", "w", stdout);

    int n; cin >> n;
    set <char> s;
    for(int i = 0; i < n; i++){
        char c; cin >> c;
        s.insert(c);
    }
    cout << s.size() << "\n";
}
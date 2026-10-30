#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    set <int> s;
    for(int i = 0; i < n; i++){
        int a; cin >> a;
        s.insert(a);
    }
    cout << s.size() << "\n";
    for(auto num : s) cout << num << " ";
    cout << "\n";
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++) solve();
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

void solve(){
    string s; cin >> s;
    set <char> st(s.begin(), s.end());
    int size = st.size();
    int answer = min(3, size);
    cout << answer << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
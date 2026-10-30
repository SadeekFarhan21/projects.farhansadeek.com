#include <bits/stdc++.h>
using namespace std;

int main(){
    string s; cin >> s;
    set <char> st(s.begin(), s.end());
    long long n; cin >> n;
    for(int i = 0; i < n; i++){
        string str; cin >> str;
        set <char> set1(str.begin(), str.end());
        if(includes(st.begin(), st.end(), set1.begin(), set1.end())){
            cout << "Yes" << "\n";
        }
        else {
            cout << "No\n";
        }
    }
    return 0;
}
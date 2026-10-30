#include <bits/stdc++.h>
using namespace std;

int main(){
    string s, ans = ""; cin >> s;
    for(int i = 0; i < s.length(); i++){
        if(s[i] == 'W' && s[i + 1] == 'U' && s[i + 2] == 'B'){
            i += 2;
            ans.push_back(' ');
            continue;
        }
        else {
            ans.push_back(s[i]);
        }
    }
    cout << ans << endl;
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    string s, ans = " "; cin >> s;
    for(int i = 0; i < s.length(); i++){
        int a = (int) s[i];
        int b = 9 - a;
        if(a > b) ans += (char) b;
        else if(a < b) ans += (char) (a);
    }
    cout << ans << endl;
}
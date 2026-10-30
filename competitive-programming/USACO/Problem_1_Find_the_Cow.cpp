#include <bits/stdc++.h>
using namespace std;

int main(){
    freopen("cowfind.in", "r", stdin);
    freopen("cowfind.out", "w", stdout);
    string s;
    getline(cin, s);
    int left = 0;
    int right = 0;
    for (int i = 0; i < s.length() - 1; i++) {
        if(s[i] == '(' && s[i + 1] == '('){
            left++;
        }
        if(s[i] == ')' && s[i + 1] == ')'){
            right++;
        }
    }
    
    cout << left * right << "\n";
    return 0;
}

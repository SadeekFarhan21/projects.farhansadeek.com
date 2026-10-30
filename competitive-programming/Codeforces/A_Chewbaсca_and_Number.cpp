#include <bits/stdc++.h>
using namespace std;

int main(){
    string s; cin >> s;
    // first line
    int first = min(s[0] - '0', '9' - s[0]);
    if(first == 0){
        cout << s[0];
    }
    else {
        cout << first;
    }
    for(int i = 1; i < s.size(); i++){
        cout << min(s[i] - '0', '9' - s[i]);
    }
    cout << "\n";
}
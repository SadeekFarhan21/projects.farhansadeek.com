#include <bits/stdc++.h>
using namespace std;

int main(){
    string s = "";
    int a, b; cin >> a >> b;
    for(char i = 'A'; i <= 'Z'; i++){
        for(int j = 0; j < a; j++){
            s.push_back(i);
        }
    }
    cout << s[b - 1] << endl;
    return 0;
}
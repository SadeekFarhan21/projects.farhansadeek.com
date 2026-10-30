#include <bits/stdc++.h>
using namespace std;

int main(){
    long long a, b;
    char c; 
    cin >> a >> c >> b;
    if(c == '='){
        if(a == b){
            cout << "Right" << "\n";
            return 0;
        }
    }
    else if(c == '>'){
        if(a > b){
            cout << "Right" << "\n";
            return 0;
        }
    }
    else if(c == '<'){
        if(a < b){
            cout << "Right" << "\n";
            return 0;
        }
    }
    
    cout << "Wrong" << "\n";
    return 0;
}
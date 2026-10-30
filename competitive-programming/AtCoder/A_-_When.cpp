#include <bits/stdc++.h>
using namespace std;

int main(){
    int a; cin >> a;
    if(a < 60){
        if(a < 10){
            cout << "21:0" << a << "\n";    
        }
        else {
            cout << "21:" << a << "\n";
        }
    }
    else {
        if(a % 60 < 10){
            cout << "22:0" << a % 60 << "\n";
        }
        else {
            cout << "22:" << a % 60 << "\n";
        }
    }
    return 0;
}
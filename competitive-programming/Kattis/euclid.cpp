#include <bits/stdc++.h>
using namespace std;

int main(){
    int a = 18, b = 15; cin >> a >> b; 
    // a, b = b, a % b
    while(b > 0){
        int temp = a;
        a = b;
        b = temp % a;
    }
    cout << a << "\n";
}
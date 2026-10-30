#include <bits/stdc++.h>
using namespace std;

int fastPower(int n, int p){
    int result = 1;
    if(p > 0){
        result = fastPower(n, p / 2);
        result *= result;
        if(p % 2 != 0) {
            result *= n;
        }
    }
    return result;
}
int main(){
    cout << fastPower(2, 3) << "\n";
    return 0;   
}
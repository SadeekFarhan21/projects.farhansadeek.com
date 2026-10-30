#include <bits/stdc++.h>
using namespace std;

bool isPrime(int n){
    for(int i = 2; i <= sqrt(n); i++){
        if(n % i == 0){
            return false;
        }
    }
    return true;
}
int main() {
    int n; cin >> n;
    while(true){
        if(isPrime(n - 2) && isPrime(n)){
            cout << n - 2 << " " << n << "\n";
            return 0;
        }
        n--;
    }
}
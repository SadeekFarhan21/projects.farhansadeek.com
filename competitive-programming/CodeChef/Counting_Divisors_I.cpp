#include <bits/stdc++.h>
using namespace std;

int divisorCount(int n){
    set <int> primes;
    for(int i = 1; i * i <= n; i++){
        if(n % i == 0){
            primes.insert(i);
            primes.insert(n / i);
        }
    }
    return primes.size();
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        int n; cin >> n;
        cout << divisorCount(n) << "\n";
    }
}
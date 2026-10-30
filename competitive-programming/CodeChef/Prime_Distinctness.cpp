#include <bits/stdc++.h>
using namespace std;

void distinctPrimeFactors(int n){
    int x = n;
    unordered_set <int> primes;
    for(int i = 2; i * i <= x; i++){
        while(n % i == 0){
            primes.insert(i);
            n /= i;
        }
    }
    if(n > 2){
        primes.insert(n);
    }
    cout << primes.size() << "\n";
    return;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        int n; cin >> n;
        distinctPrimeFactors(n);
    }
}
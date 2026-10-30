#include <bits/stdc++.h>
using namespace std;
int N = 1e6;
vector<bool> sieve_of_eratosthenes(int n) {
    vector<bool> is_prime(n+1, true);
    is_prime[0] = is_prime[1] = false;
    for (int p = 2; p * p <= n; ++p) {
        if (is_prime[p]) {
            for (int i = p * p; i <= n; i += p) {
                is_prime[i] = false;
            }
        }
    }
    return is_prime;
}

int main(){
    int n; cin >> n;
    vector<bool> primes = sieve_of_eratosthenes(N);
    for(int i = 2; i < n / 2 + 1; i++){
        if(primes[i] == false && primes[n - i] == false){
            cout << i << " " << n - i << "\n";
            return 0;
        }
     }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;
int MOD = 1e9 + 7;

// Function to calculate modular exponentiation
long long power(long long base, long long exponent) {
    long long result = 1;
    while (exponent > 0) {
        if (exponent % 2 == 1) {
            result = (result * base) % MOD;
        }
        base = (base * base) % MOD;
        exponent = exponent / 2;
    }
    return result;
}

int main(){
    int n; cin >> n;
    cout << power(2, n) << "\n";
    return 0;
}
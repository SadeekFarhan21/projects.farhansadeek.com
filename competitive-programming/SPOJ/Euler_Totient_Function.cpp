#include <bits/stdc++.h>
using namespace std;
#define ll long long

const int limit = 1000000000;
vector<bool> is_prime(limit + 1, true);
set<int> primes;

void sieve() {
    is_prime[0] = is_prime[1] = false;
    for (int i = 2; i * i <= limit; ++i) {
        if (is_prime[i]) {
            primes.insert(i);
            for (int j = i * i; j <= limit; j += i) {
                is_prime[j] = false;
            }
        }
    }

    for (int i = max(2, (int)sqrt(limit) + 1); i <= limit; ++i) {
        if (is_prime[i]) {
            primes.insert(i);
        }
    }
}

void solve() {
    int n;
    cin >> n;
    int result = n;

    for (auto prime : primes) {
        if (prime * prime > n) break;

        if (n % prime == 0) {
            while (n % prime == 0) {
                n /= prime;
            }
            result -= result / prime;
        }
    }

    if (n > 1) {
        result -= result / n;
    }

    cout << result << "\n";
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    sieve();
    
    int t;
    cin >> t;

    for (int i = 0; i < t; i++) {
        solve();
    }

    return 0;
}
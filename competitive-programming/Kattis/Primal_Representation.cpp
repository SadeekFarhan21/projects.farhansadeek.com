#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

const int MAX_LIMIT = 46342;
bitset<MAX_LIMIT> is_prime;
vector<int> primes;
void sieve() {
    is_prime.set();
    is_prime[0] = 0;
    is_prime[1] = 0;
    for (int i = 2; i * i < MAX_LIMIT; i++) {
        if (is_prime[i]) {
            for (int j = i * i; j < MAX_LIMIT; j += i) {
                is_prime[j] = 0;
            }
        }
    }
    for (int p = 2; p < MAX_LIMIT; p++) {
        if (is_prime[p]) {
            primes.push_back(p);
        }
    }
}

void factorize(int x) {
    if (x < 0) {
        cout << -1 << ' ';
        x = -x;
    }
    bool first = true;
    for (int p : primes) {
        if (1LL * p * p > x)
            break;
        if (x % p == 0) {
            int count = 0;
            while (x % p == 0) {
                count++;
                x /= p;
            }
            if (!first)
                cout << " ";
            cout << p;
            if (count > 1)
                cout << "^" << count;
            first = false;
        }
    }
    if (x > 1) {
        if (!first)
            cout << " ";
        cout << x;
    }
    cout << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    sieve();
    int n;
    while (cin >> n) {
        factorize(n);
    }
    return 0;
}
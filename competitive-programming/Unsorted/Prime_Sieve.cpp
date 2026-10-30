#include <bits/stdc++.h>
using namespace std;

const int MAXN = 1e8;
bitset<MAXN + 1> is_prime;
void sieve() {
    is_prime[0] = 0;
    is_prime[1] = 0;
    for (int i = 2; i * i <= MAXN; i++) {
        if (is_prime[i]) {
            for (int j = i * i; j <= MAXN; j += i) {
                is_prime[j] = 0;
            }
        }
    }
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    is_prime.set();
    sieve();
    int n, q;
    cin >> n >> q;
    int count = 0;
    for (int i = 0; i <= n; i++) {
        count += is_prime[i];
    }
    cout << count << '\n';
    for (int i = 0; i < q; i++) {
        int index;
        cin >> index;
        cout << is_prime[index] << '\n';
    }
    return 0;
}
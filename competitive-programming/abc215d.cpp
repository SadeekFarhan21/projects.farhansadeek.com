#include <bits/stdc++.h>
using namespace std;
#define int long long

const int maxn = 1e5 + 1;
bitset<maxn> is_prime;
vector<int> primes;
vector<int> forbidden_primes;
vector<int> answer;
void sieve() {
    is_prime.set();
    is_prime[0] = is_prime[1] = 0;
    for (int i = 2; i < maxn; i++) {
        if (is_prime[i]) {
            primes.push_back(i);
            if (i * i < maxn) {
                for (int j = i * i; j < maxn; j += i) {
                    is_prime[j] = 0;
                }
            }
        }
    }
}

void solve() {
    int n, m;
    cin >> n >> m;
    answer.resize(m + 1, 1);
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    for (int i = 0; i < n; i++) {
        int num = v[i];
        if (num <= 1)
            continue;
        for (size_t j = 0; j < primes.size(); j++) {
            if (primes[j] * primes[j] > num) {
                break;
            }

            if (num % primes[j] == 0) {
                forbidden_primes.push_back(primes[j]);
                while (num % primes[j] == 0) {
                    num /= primes[j];
                }
            }
        }
        if (num > 1) {
            forbidden_primes.push_back(num);
        }
    }
    sort(forbidden_primes.begin(), forbidden_primes.end());
    forbidden_primes.erase(unique(forbidden_primes.begin(), forbidden_primes.end()), forbidden_primes.end());

    if (m >= 0)
        answer[0] = 0;
    for (size_t i = 0; i < forbidden_primes.size(); i++) {
        if (forbidden_primes[i] > m)
            continue;
        for (int j = forbidden_primes[i]; j <= m; j += forbidden_primes[i]) {
            answer[j] = 0;
        }
    }
    cout << accumulate(answer.begin() + 1, answer.end(), 0LL) << '\n';
    for (int i = 1; i <= m; i++) {
        if (answer[i] == 1) {
            cout << i << '\n';
        }
    }
    return;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    sieve();
    solve();
    return 0;
}
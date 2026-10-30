#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double
const int N = 100005;
vector<int> prime_count(N, 0);

void sieve() {
    for (int i = 2; i < N; i++) {
        if (prime_count[i] == 0) {
            for (int j = i; j < N; j += i) {
                prime_count[j]++;
            }
        }
    }
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    sieve();
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
}
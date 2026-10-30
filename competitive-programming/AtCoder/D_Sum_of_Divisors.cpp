#include "bits/stdc++.h" 
using namespace std;

#define ll long long
#define FOR(i, a, b) for (int i = (a); i < (b); ++i)
#define nl '\n'

int main() {
    ios_base::sync_with_stdio(0);
    cin.tie(0);

    int N;
    cin >> N;
    ll ans = 0;

    // Iterate over all numbers from 1 to N
    FOR(i, 1, N+1) {
        ll lo = i;
        ll hi = (N / i) * i;
        
        // Count the number of elements between lo and hi divisible by i
        ll cnt = hi / i - lo / i + 1;
        
        // Use the formula for the sum of an arithmetic series
        ans += (cnt * (lo + hi)) / 2;
    }

    cout << ans << nl;

    return 0;
}
#include <bits/stdc++.h>
#include <boost/multiprecision/cpp_int.hpp>
using namespace std;
using boost::multiprecision::cpp_int;
#define int cpp_int
int MOD = 1000000007;

void solve() {
    int n;
    cin >> n;
    int result = (n * (n + 1) * (n + 2)) / 3;
    while (result > MOD) {
        result %= MOD;
    }
    cout << result << '\n';
}

int32_t main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        cout << "Case " << i + 1 << ": ";
        solve();
    }
}
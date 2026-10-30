#include <bits/stdc++.h>
#include <boost/multiprecision/cpp_int.hpp>
using namespace std;
using boost::multiprecision::cpp_int;

#define int long long

cpp_int combination(int n, int k) {
    if (k < 0 || k > n) {
        return 0;
    }
    if (k == 0 || k == n) {
        return 1;
    }
    if (k > n - k) {
        k = n - k;
    }
    cpp_int result = 1;
    for (int i = 1; i <= k; i++) {
        result *= (n - k + i);
        result /= i;
    }
    return result;
}

void solve() {
    int n, k;
    if (!(cin >> n >> k))
        return;
    if (k == 0) {
        cout << 1 << '\n';
        return;
    }

    int sum_v = 0;
    for (int i = 0; i < k; i++) {
        int x;
        cin >> x;
        sum_v += x;
    }

    int required_space = sum_v + k - 1;
    int n_prime = n - required_space;

    if (n_prime < 0) {
        cout << 0 << '\n';
    } else {
        cout << combination(n_prime + k, k) << '\n';
    }
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);

    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
    return 0;
}
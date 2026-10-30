#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int x;
    cin >> x;
    vector<pair<int, int>> divisors;
    for (int i = 1; i <= sqrt(x); i++) {
        if (x % i == 0)
            divisors.push_back({i, x / i});
    }
    int min_gcd = INT_MAX;
    int answer_1 = INT_MAX;
    int answer_2 = INT_MAX;
    for (auto [divisor_1, divisor_2] : divisors) {
        int cd = gcd(divisor_1, divisor_2);
        if (cd <= min_gcd) {
            min_gcd = cd;
            answer_1 = divisor_1;
            answer_2 = divisor_2;
        }
    }
    cout << answer_1 << " " << answer_2 << "\n";
    return 0;
}
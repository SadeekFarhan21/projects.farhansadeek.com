#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double
int MOD = 1e9 + 7;
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    vector<int> prefix(n);
    prefix[0] = v[0];
    for (int i = 1; i < n; i++) {
        prefix[i] = (prefix[i - 1] % MOD + v[i] % MOD) % MOD;
    }
    int answer = 0;
    for (int i = 0; i < n - 1; i++) {
        int sum_after = (prefix[n - 1] - prefix[i] + MOD) % MOD;
        int term = (v[i] % MOD) * sum_after % MOD;
        answer = (answer + term) % MOD;
    }
    cout << answer << "\n";
    return 0;
}


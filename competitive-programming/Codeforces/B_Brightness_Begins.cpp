#include <bits/stdc++.h>
using namespace std;
#define int long long
int solve(long long k) {
    if (k == 1) {
        return 2;
    }
    return k * k;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    
    int t;
    cin >> t;
    vector<long long> results(t);
    
    for (int i = 0; i < t; ++i) {
        long long k;
        cin >> k;
        results[i] = solve(k);
    }x
    
    for (const auto& result : results) {
        cout << result << "\n";
    }
    
    return 0;
}

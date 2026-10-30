#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, p;
    cin >> n >> p;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
        v[i] -= p;
    }
    int answer = LLONG_MIN;
    int current = 0;
    for (int i = 0; i < n; i++) {
        current += v[i];
        if (current < 0) {
            current = 0;
        }
        answer = max(current, answer);
    }
    cout << answer << '\n';
    return 0;
}
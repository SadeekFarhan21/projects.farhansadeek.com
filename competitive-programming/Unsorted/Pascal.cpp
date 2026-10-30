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
    int n;
    cin >> n;
    int smallest_factor = n;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            smallest_factor = i;
            break;
        }
    }
    cout << n - n / smallest_factor << '\n';
    return 0;
}
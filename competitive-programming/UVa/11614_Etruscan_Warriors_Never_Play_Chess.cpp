#include <bits/stdc++.h>
#include <cmath>

using namespace std;

void solve() {
    long long sum;
    cin >> sum;

    // Calculate the root using integer-based calculations
    long long n = (-1 + static_cast<long long>(sqrt(1 + 4 * sum))) / 2;
    
    cout << n << "\n";
}

int main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
    return 0;
}

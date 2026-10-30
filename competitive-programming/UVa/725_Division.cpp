#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
#include <locale>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    while (cin >> n && n != 0) {
        for (int numerator = 10000; numerator <= 99999; numerator += 1) {
            for (int denominator = 1000; denominator <= 99999; denominator += 1) {
                if (numerator / denominator == n && numerator % denominator == 0) {
                    cout << numerator << " / ";
                    if (denominator < 10000) {
                        cout << '0' << denominator << '\n';
                    }
                }
            }
        }
    }
    return 0;
}
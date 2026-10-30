#include <bits/stdc++.h>
using namespace std;
#define int long long

int32_t main() {
    int n;
    cin >> n;
    vector<int> v(n);
    int largest = INT_MIN;
    for (int i = 0; i < n; i++) {
        cin >> v[i];
        if (v[i] > largest) {
            largest = v[i];
        }
    }
    int complement = 0;
    int g = 0;
    for (int i = 0; i < n; i++) {
        int diff = largest - v[i];
        complement += diff;
        g = gcd(g, diff);
    }
    cout << complement / g << " " << g << "\n";
    return 0;
}
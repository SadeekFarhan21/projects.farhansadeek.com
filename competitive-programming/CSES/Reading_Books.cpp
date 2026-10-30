#include <bits/stdc++.h>
using namespace std;
#define int long long

int32_t main() {
    int n;
    cin >> n;
    vector<int> v(n);
    int largest = 0;
    int sum = 0;
    for (int i = 0; i < n; i++) {
        cin >> v[i];
        largest = max(largest, v[i]);
        sum += v[i];
    }
    cout << max(2 * largest, sum) << '\n';
    return 0;
}
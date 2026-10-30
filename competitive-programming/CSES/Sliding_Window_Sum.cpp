#include <bits/stdc++.h>
using namespace std;
#define int unsigned long

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, k;
    cin >> n >> k;
    int x, a, b, c;
    cin >> x >> a >> b >> c;
    vector<int> v(1e7 + 1);
    v[0] = x;
    for (int i = 1; i < n; i++) {
        v[i] = (a * v[i - 1] + b) % c;
    }

    int current_sum = 0;
    for (int i = 0; i < k; i++) {
        current_sum += v[i];
    }
    int answer = current_sum;
    for (int i = k; i < n; i++) {
        current_sum = current_sum + (v[i] - v[i - k]);
        answer ^= current_sum;
    }
    cout << answer << "\n";
    return 0;
}
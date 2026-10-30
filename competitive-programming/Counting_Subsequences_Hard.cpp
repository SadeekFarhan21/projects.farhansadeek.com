#include <bits/stdc++.h>
using namespace std;

void solve() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++)
        cin >> v[i];
    int count = 0, left = 0, right = 0, running_sum = 0;
    while (right < n) {
        if (running_sum < 47) {
            running_sum += v[right];
        } else if (running_sum > 47) {
            running_sum -= v[left];
        } else {
            count += 1;
            left += 1;
            right += 1;
            running_sum += (v[right] - v[left]);
        }
    }
    cout << count << '\n';
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    while (t--) {
        solve();
    }
    return 0;
}
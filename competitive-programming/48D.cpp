#include <bits/stdc++.h>
using namespace std;

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
    vector<int> copy(v.begin(), v.end());
    sort(copy.rbegin(), copy.rend());
    map<int, int> m;
    int count = 0;
    for (int i = 0; i < n; i++) {
        m[v[i]] += 1;
        count = max(m[v[i]], count);
    }
    if (copy.back() != 1) {
        cout << -1 << '\n';
        return 0;
    }
    for (int i = 1; i < n; i++) {
        if (copy[i - 1] - copy[i] > 1 || m[copy[i - 1]] > m[copy[i]]) {
            cout << -1 << '\n';
            return 0;
        }
    }
    cout << count << '\n';
    for (int i = 0; i < n; i++) {
        cout << m[v[i]] << ' ';
        m[v[i]] -= 1;
    }
    return 0;
}
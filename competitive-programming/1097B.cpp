#include <bits/stdc++.h>
using namespace std;

bool solve(int index, int sum, const vector<int> &v) {
    if (v.size() == index) {
        return (sum % 360 == 0);
    }
    return solve(index + 1, sum + v[index], v) || solve(index + 1, sum - v[index], v);
}

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
    if (solve(0, 0, v)) {
        cout << "YES\n";
    } else {
        cout << "NO\n";
    }
    return 0;
}
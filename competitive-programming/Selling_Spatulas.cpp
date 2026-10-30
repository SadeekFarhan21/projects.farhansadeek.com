#include <bits/stdc++.h>
using namespace std;

void solve(int n) {
    vector<int> v(1440, -8);
    for (int i = 0; i < n; i++) {
        int index;
        cin >> index;
        double value;
        cin >> value;
        v[index] += round(value * 100);
    }

    int current = 0;
    int profit = 0;
    int start = 0, end = 0;
    int current_start = 0;
    for (int i = 0; i < 1440; i++) {
        current += v[i];
        if (current > profit || (current == profit && i - current_start < end - start && current > 0)) {
            end = i;
            profit = current;
            start = current_start;
        }

        if (current <= 0) {
            current_start = i + 1;
            current = 0;
        }
    }

    if (profit == 0) {
        cout << "no profit\n";
        return;
    }
    cout << fixed << setprecision(2) << profit / 100.0 << ' ' << start << ' ' << end << '\n';
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    while (cin >> n && n != 0) {
        solve(n);
    }
    return 0;
}
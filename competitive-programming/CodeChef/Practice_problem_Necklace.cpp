#include <bits/stdc++.h>
using namespace std;

void solve() {
    int n, k;
    cin >> n >> k;

    deque<int> dq;

    for (int i = 0; i < n; i++) {
        int a;
        cin >> a;
        dq.push_back(a);
    }

    for (int i = 0; i < k; i++) {
        int a = dq.front();
        dq.pop_front();
        dq.push_back(a);
    }

    for (auto a : dq)
        cout << a << " ";

    cout << "\n";
}

int main() {
    int t;
    cin >> t;

    for (int i = 0; i < t; i++) {
        solve();
    }

    return 0;
}

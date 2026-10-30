#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

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
    int answer = 0;
    deque<int> dq;
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && v[dq.back()] >= v[i]) {
            dq.pop_back();
        }
        dq.push_back(i);
        if (dq.front() <= i - k) {
            dq.pop_front();
        }
        if (i >= k - 1) {
            answer ^= v[dq.front()];
        }
    }
    cout << answer << "\n";
    return 0;
}
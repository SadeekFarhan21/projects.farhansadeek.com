#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    int n;
    cin >> n;

    vector<int> h(n);
    for (int i = 0; i < n; i++) {
        cin >> h[i];
    }

    vector<int> left(n, -1);
    vector<int> right(n, -1);

    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && h[st.top()] <= h[i]) {
            st.pop();
        }
        if (!st.empty()) {
            left[i] = st.top();
        }
        st.push(i);
    }

    while (!st.empty()) {
        st.pop();
    }

    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && h[st.top()] <= h[i]) {
            st.pop();
        }
        if (!st.empty()) {
            right[i] = st.top();
        }
        st.push(i);
    }

    vector<int> order(n);
    for (int i = 0; i < n; i++) {
        order[i] = i;
    }
    int answer = 1;
    sort(order.begin(), order.end(), [&](int a, int b) { return h[a] < h[b]; });
    vector<int> dp(n, 1);
    for (auto i : order) {
        if (left[i] != -1) {
            dp[left[i]] = max(dp[left[i]], dp[i] + 1);
        }
        if (right[i] != -1) {
            dp[right[i]] = max(dp[right[i]], dp[i] + 1);
        }
        answer = max(answer, dp[i]);
    }
    cout << answer << '\n';
    return 0;
}
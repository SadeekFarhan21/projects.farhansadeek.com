#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve() {
    int n, k;
    cin >> n >> k;
    int answer = 0;
    int counter = 0;
    string s;
    cin >> s;
    for (int i = 0; i < n; i++) {
        if (s[i] == '0') {
            counter += 1;
        } else if (s[i] == '1') {
            counter = 0;
        }
        
        if (counter == k) {
            answer += 1;
            counter = 0;
        }
    }
    cout << answer << "\n";
    return;
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
}
#include <bits/stdc++.h>
using namespace std;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    string s;
    cin >> s;
    int front = 0, back = 0, n = s.size();
    for (int i = 0; i < n; i++) {
        if (s[i] == 'a') {
            front += 1;
        } else {
            break;
        }
    }

    for (int i = n - 1; i >= 0; i--) {
        if (s[i] == 'a') {
            back += 1;
        } else {
            break;
        }
    }
    string rest = s.substr(front, s.size() - back - front);
    string reversed = rest;
    reverse(reversed.begin(), reversed.end());
    if (rest == reversed) {
        if (front <= back) {
            cout << "Yes\n";
        } else {
            cout << "No\n";
        }
    } else {
        cout << "No\n";
    }
    return 0;
}
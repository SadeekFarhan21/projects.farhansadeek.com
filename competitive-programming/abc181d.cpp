#include <bits/stdc++.h>
using namespace std;
#define int unsigned int
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    string s;
    cin >> s;
    if (s.size() <= 2) {
        sort(s.begin(), s.end());
        if (stoll(s) % 8 == 0) {
            cout << "Yes\n";
            return 0;
        }
        reverse(s.begin(), s.end());
        if (stoll(s) % 8 == 0) {
            cout << "Yes\n";
            return 0;
        }
        cout << "No\n";
        return 0;
    }
    map<int, int> m;
    for (int i = 0; i < s.size(); i++) {
        m[s[i] - '0'] += 1;
    }
    for (int i = 104; i < 1000; i += 8) {
        string num = to_string(i);
        map<int, int> counter;
        for (int j = 0; j < num.size(); j++) {
            counter[num[j] - '0'] += 1;
        }
        bool found = true;
        for (auto x : counter) {
            found &= (m[x.first] >= x.second);
        }
        if (found) {
            cout << "Yes\n";
            return 0;
        }
    }
    cout << "No\n";
    return 0;
}
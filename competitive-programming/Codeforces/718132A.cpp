#include <bits/stdc++.h>
using namespace std;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    string s;
    cin >> s;
    int answer = 0;
    for (int i = 0; i < s.size(); i++) {
        if ((s[i] - '0') % 2 == 0) {
            answer += (i + 1);
        }
    }
    cout << answer << "\n";
    return 0;
}
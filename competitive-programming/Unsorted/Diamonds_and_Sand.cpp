#include <bits/stdc++.h>
using namespace std;

#define int long long
#define double long double

void solve() {
    string line;
    getline(cin, line);
    int a = 0, b = 0;
    for (char c : line) {
        if (c == '<')
            a++;
        else if (c == '>')
            b++;
    }
    cout << min(a, b) << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    cin.ignore(numeric_limits<streamsize>::max(),
               '\n'); // consume endline after t

    while (t--)
        solve();
}
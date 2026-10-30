#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    map<string, int> m;
    int q;
    cin >> q;
    for (int i = 0; i < q; i++) {
        int type;
        cin >> type;
        if (type == 1) {
            string name;
            cin >> name;
            int points;
            cin >> points;
            m[name] += points;
        } else if (type == 2) {
            string name;
            cin >> name;
            m[name] = 0;
        } else {
            string name;
            cin >> name;
            cout << m[name] << "\n";
        }
    }
}
#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    int q;
    cin >> q;
    set<int> s;
    for (int i = 0; i < q; i++) {
        int y, x;
        cin >> y >> x;
        // insert an element
        if (y == 1) {
            s.insert(x);
        } else if (y == 2 && s.find(x) != s.end()) {
            s.erase(x);
        } else if (y == 3 && s.find(x) != s.end()) {
            cout << "Yes" << "\n";
        } else {
            cout << "No" << "\n";
        }
    }
}
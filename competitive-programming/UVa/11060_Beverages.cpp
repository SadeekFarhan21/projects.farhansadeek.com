#include <iostream>
#include <map>
#include <string>
#include <vector>
using namespace std;

void solve() {
    int n, tc = 1;
    while (cin >> n) {
        vector<string> nodes(n);
        map<string, int> in_degrees;
        for (int i = 0; i < n; ++i) {
            cin >> nodes[i];
        }

        int m;
        cin >> m;
        for (int i = 0; i < m; ++i) {
            int start, end ; cin >
        }

        vector<string> answer;
        cout << "Case #" << tc++ << ": Dilbert should drink beverages in this order:";
        for (int i = 0; i < n; ++i) {
            cout << " " << answer[i];
        }
        cout << ".\n";
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    solve();

    return 0;
}
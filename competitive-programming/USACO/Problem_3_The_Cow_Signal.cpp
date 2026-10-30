#include <bits/stdc++.h>
using namespace std;

int main() {
    freopen("cowsignal.in", "r", stdin);
    freopen("cowsignal.out", "w", stdout);
    int m, n, k;
    cin >> m >> n >> k;

    vector<string> signal;
    for (int i = 0; i < m; i++) {
        string row;
        cin >> row;
        signal.push_back(row);
    }

    for (int i = 0; i < m; i++) {
        for (int r = 0; r < k; r++) { // Repeat rows K times
            for (int j = 0; j < n; j++) {
                for (int c = 0; c < k; c++) { // Repeat characters K times
                    cout << signal[i][j];
                }
            }
            cout << endl;
        }
    }

    return 0;
}

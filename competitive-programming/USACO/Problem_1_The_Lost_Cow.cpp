#include <bits/stdc++.h>
using namespace std;

int main() {
    // freopen("lostcow.in", "r", stdin);
    // freopen("lostcow.out", "w", stdout);
    
    int x, y;
    cin >> x >> y;
    int n = 1;
    int distance = 0;
    int direction = 1;

    while (true) {
        if (direction == 1) {
            x += n;
        } else {
            x -= n;
        }

        distance += abs(n);

        if (abs(x - y) < n) {
            cout << distance << "\n";
            break;
        }

        n *= - 2;           // Double the step size
    }

    return 0;
}

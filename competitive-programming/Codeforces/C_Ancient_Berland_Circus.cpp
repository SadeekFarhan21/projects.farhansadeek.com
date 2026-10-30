#include <bits/stdc++.h>
using namespace std;
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);

    vector<pair<double, double>> v;

    for (int i = 0; i < 3; i++) {
        int x, y;
        cin >> x >> y;
        v.push_back({x, y});
    }
    double radius = 99999999999;
    for (int i = 0; i < 3; i++) {
        auto [x1, y1] = v[i];
        for (int j = i + 1; j < 3; j++) {
            auto [x2, y2] = v[j]; 
            double d = sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
            radius = min(radius, d);
        }
    }
    cout << 3.14159 * radius * radius << "\n";
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    double x, h, s; cin >> x >> h >> s;
    double ans = sqrt((x * x) + (h * h));
    cout << ans * (1 - s / 100.0);
    return 0;
}
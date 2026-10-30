#include <bits/stdc++.h>
using namespace std;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int a, b;
    cin >> a >> b;
    int answer = a;
    while (a >= b) {
        int new_candles = a / b;
        int leftover = a % b;
        answer += new_candles;
        a = new_candles + leftover;
    }
    cout << answer << '\n';
}
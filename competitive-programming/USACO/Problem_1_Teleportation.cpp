#include <bits/stdc++.h>
using namespace std;

int main(){
    freopen("teleport.in", "r", stdin);
    freopen("teleport.out", "w", stdout);
    
    int x, y, a, b; cin >> a >> b >> x >> y;
    cout << min(abs(a - b), min(abs(a - x), abs(a - y)) + min(abs(b - x), abs(b - y)));
    return 0;
}
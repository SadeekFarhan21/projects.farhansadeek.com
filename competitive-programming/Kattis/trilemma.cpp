#include <bits/stdc++.h>
using namespace std;

void solve(){
    int p, q, r, x, y, z; cin >> p >> q >> r >> x >> y >> z;
    int a = abs(x - p);
    int b = abs(y - q);
    int c = abs(z - r);
    cout << a << b << c << "\n";
    /*
    if(a == 0 || b == 0 || c == 0){
        cout << "not a triangle" << "\n";
        return;
    }

    if(a == b || b == c || a == c) {
        cout << "isosceles ";
    }
    else {
        cout << "scalene ";
    }

    if(a * a == (b * b + c * c)) {
        cout << "right ";
    }

    else if(a * a < (b * b + c * c)) {
        cout << "obtuse ";
    }

    else {
        cout << "acute ";
    }

    cout << "triangle" << "\n";
    */
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        printf("Case #%d: ", i + 1);
        solve();
    }
}
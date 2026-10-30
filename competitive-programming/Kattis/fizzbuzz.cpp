#include <bits/stdc++.h>
using namespace std;

void solve(int x, int y, int n){
    if(n % x == 0 && n % y == 0){
        cout << "FizzBuzz";
    }
    else if(n % x == 0){
        cout << "Fizz";
    }
    else if(n % y == 0){
        cout << "Buzz";
    }
    else {
        cout << n;
    }
    cout << "\n";
}

int main(){
    int x, y, n; cin >> x >> y >> n;
    for(int i = 1; i <= n; i++){
        solve(x, y, i);
    }
    return 0;
}
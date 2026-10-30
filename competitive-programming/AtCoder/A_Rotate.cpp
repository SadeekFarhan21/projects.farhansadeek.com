#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    int digit_sum = 0;
    while(n > 0){
        digit_sum += n % 10;
        n /= 10;
    }
    digit_sum *= 111;
    cout << digit_sum << "\n";
}
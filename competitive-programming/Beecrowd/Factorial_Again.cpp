#include <bits/stdc++.h>
using namespace std;

vector<int> factorial = {1, 0, 0, 0, 0, 0};
void solve(int n){
    int temp = n;
    int i = 1; // Initialize i to 0
    int sum = 0;
    while(temp != 0){
        int remainder = temp % 10;
        sum += remainder * factorial[i];
        temp /= 10;
        i++;
    }
    cout << sum << "\n";
}

int main(){
    for(int i = 1; i <= 5; i++){
        factorial[i] = factorial[i - 1] * i;
        // cout << factorial[i] << " ";
    }
    while(true){
        int n; cin >> n;
        if(n == 0){
            return 0;
        }
        solve(n);
    }
    return 0;
}
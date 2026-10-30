#include <bits/stdc++.h>
using namespace std;

int getSum(int n){
    int sum = 0;
    while(n > 0){
        sum += n % 10;
        n /= 10;
    }
    return sum;
}

int main(){
    int n; cin >> n;
    int count = 0;
    for(int i = max(n - 97, 0); i <= n; i++){
        if(i + getSum(i) + getSum(getSum(i)) == n){
            count++;
        }
    }
    cout << count << "\n";
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    long n, k; cin >> n >> k;
    if(k == 1){
        cout << n << '\n';
        return 0;
    }
    long answer = 1;
    while(answer < n){
        answer *= 2;
        answer += 1;
    }
    co
}
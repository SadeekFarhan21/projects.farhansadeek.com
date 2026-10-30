#include <bits/stdc++.h>
using namespace std;

void solve(){
    map <int, int> divisors;
    int n; cin >> n;
    while(n % 2 == 0){
        divisors[2]++;
        n /= 2;
    }
    for(int i = 3; i <= sqrt(n); i++){
        while(n % i == 0){
            divisors[i]++;
            n /= i;
        }
    }
    if(n > 2){
        divisors[n]++;
    }
    int result = 1;
    for(auto x : divisors){
        result *= (x.second + 1);
    }
    
    cout << result << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
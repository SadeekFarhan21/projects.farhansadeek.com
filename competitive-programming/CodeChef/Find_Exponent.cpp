// a ^ b mod m = ((a mod m) ^ b) mod m

#include <bits/stdc++.h>
using namespace std;

long long fast_power(long long n, long long p){
    long long result = 1;
    if(p > 0){
        result = fast_power(n, p / 2);
        result *= result;
        if(p % 2 != 0){
            result *= n;
        }
    }
    return result;
}

void solve(){
    long long a, b, m; cin >> a >> b >> m;
    long long answer = a % m;
    answer = fast_power(answer, b);
    answer %= m;
    cout << answer << "\n";
}

int main(){
    long long t; cin >> t;
    for(long long i = 0; i < t; i++){
        solve();
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main(){
    cin.tie(0) -> sync_with_stdio(0);
    ll n; cin >> n;
    ll answer = 0;
    for(ll i = 2; i * i <= n; i++){
        ll e = 0;
        while(n % i == 0){
            e++, n /= i;
        }
        for(ll j = 1; e - j >= 0; j++){
            e -= j, answer++;
        }
    }
    if(n > 1){
        answer++;
    }
    cout << answer << "\n";
    return 0;
}

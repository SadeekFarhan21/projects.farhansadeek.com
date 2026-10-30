#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve(){
    int n;
    cin >> n;
    int answer = INT_MAX;
    for (int i = 1; i <= sqrt(n); i++) {
        if (n % i == 0) {
            answer = min(answer, abs(n / i - i));
        }
    }
    cout << answer << "\n";
}

int32_t main(){
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
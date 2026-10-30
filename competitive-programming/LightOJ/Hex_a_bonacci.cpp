#include <iostream>
using namespace std;
#define int long long
const int MOD = 10000007;
const int MAXN = 10001; 

int dp[MAXN];
int a, b, c, d, e, f, n;

int32_t main() {
    int t; cin >> t;
    for(int i = 1; i <= t; i++){
        cin >> a >> b >> c >> d >> e >> f >> n;
        dp[0] = a % MOD, dp[1] = b % MOD, dp[2] = c % MOD, dp[3] = d % MOD, dp[4] = e % MOD, dp[5] = f % MOD;
        for(int i = 6; i <= n; i++){
            dp[i] = (dp[i - 1] % MOD + dp[i - 2] % MOD + dp[i - 3] % MOD + dp[i - 4] % MOD + dp[i - 5] % MOD + dp[i - 6] % MOD) % MOD;
        }
        printf("Case %lld: %lld\n", i, dp[n]);
    }
    return 0;
}

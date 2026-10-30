#include <bits/stdc++.h>
using namespace std;
#define int long long
const int MAX_5 = 5200;

pair<int, int> prime_factorization(int n) {
    int two = 0, five = 0;
    while (n % 2 == 0) {
        two += 1;
        n /= 2;
    }
    while (n % 5 == 0) {
        five += 1;
        n /= 5;
    }
    return make_pair(two, five);
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, k;
    cin >> n >> k;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }

    int answer = 0;
    vector<vector<int>> dp(k + 1, vector<int>(MAX_5 + 1, -1));
    dp[0][0] = 0;
    for (int i = 0; i < n; i++) {
        int c2 = prime_factorization(v[i]).first;
        int c5 = prime_factorization(v[i]).second;
        for (int j = k; j >= 1; j--) {
            for (int f = MAX_5; f >= c5; f--) {
                if (dp[j - 1][f - c5] != -1)
                    dp[j][f] = max(dp[j][f], dp[j - 1][f - c5] + c2);
            }
        }
    }
    for (int f = 0; f <= MAX_5; f++) {
        if (dp[k][f] != -1) {
            answer = max(answer, min(dp[k][f], f));
        }
    }

    cout << answer << '\n';
    return 0;
}
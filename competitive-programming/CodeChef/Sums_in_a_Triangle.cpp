#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

void solve(){
    int n;
    cin >> n;
    vector<vector<int>> array(n, vector<int>(n, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j <= i; j++) {
            cin >> array[i][j];
        }
    }
    vector<vector<int>> sum(n, vector<int>(n, 0));
    // Left most column as the number
    sum[0][0] = array[0][0];
    for (int i = 1; i < n; i++) {
        sum[i][0] = sum[i - 1][0] + array[i][0];
    }

    for (int i = 1; i < n; i++) {
        for (int j = 1; j < n; j++) {
            sum[i][j] = array[i][j] + max(sum[i - 1][j], sum[i - 1][j - 1]);
        }
    }
    int answer = 0;
    for (int i = 0; i < n; i++) {
        answer = max(sum[n - 1][i], answer);
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
#include <bits/stdc++.h>
using namespace std;
#define int long long
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<int> sum(50, 0);
    vector<int> ans(50, 0);
    for (int i = 1; i < 50; i++) {
        sum[i] = sum[i - 1] + i;
        ans[i] = ans[i - 1] + sum[i];
    }
    cout << distance(ans.begin(), upper_bound(ans.begin(), ans.end(), n)) - 1 << '\n';
    return 0;
}
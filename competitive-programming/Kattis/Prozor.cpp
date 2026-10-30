#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int r, s, k;
    cin >> r >> s >> k;
    vector<string> v(r + 1);
    for (int i = 1; i <= r; i++) {
        cin >> v[i];
    }
    vector<vector<int>> prefix(r + 1, vector<int>(s + 1));
    for (int i = 1; i <= r; i++) {
        for (int j = 1; j <= s; j++) {
            prefix[i][j] = prefix[i - 1][j] + prefix[i][j - 1] - prefix[i - 1][j - 1] + (v[i][j - 1] == '*');
        }
    }
    vector<pair<int, int>> coordinates(2);
    int answer = 0;
    for (int bottom = k; bottom <= r; bottom += 1) {
        for (int right = k; right <= s; right += 1) {
            int left = right - k;
            int top = bottom - k;
            int total = prefix[bottom - 1][right - 1] + prefix[top + 1][left + 1] - prefix[bottom - 1][left + 1] - prefix[top + 1][right - 1];
            if (total >= answer) {
                coordinates[0] = {top, left};
                coordinates[1] = {bottom, right};
                answer = total;
            }
        }
    }

    int top_x = coordinates[0].first;
    int top_y = coordinates[0].second;
    int bottom_x = coordinates[1].first;
    int bottom_y = coordinates[1].second;
    cout << answer << "\n";
    v[top_x - 1][top_y] = '+';
    v[top_x - 1][bottom_y] = '+';
    v[bottom_x - 1][top_y] = '+';
    v[bottom_x - 1][bottom_y] = '+';
    
    return 0;
}
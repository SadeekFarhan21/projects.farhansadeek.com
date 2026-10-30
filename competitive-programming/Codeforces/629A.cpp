#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<int> row(n, 0), col(n, 0);
    vector<vector<char>> grid(n, vector<char>(n));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            cin >> grid[i][j];
        }
    }
    int answer = 0;
    // compute the row counter
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            row[i] += (grid[i][j] == 'C');
        }
    }

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            col[i] += (grid[j][i] == 'C');
        }
    }

    for (int i = 0; i < n; i++) {
        answer += ((row[i] - 1) * row[i]) / 2;
        answer += ((col[i] - 1) * col[i]) / 2;
    }
    cout << answer << '\n';
    return 0;
}
#include <bits/stdc++.h>
using namespace std;
#define int long long
void solve(){
    int n;
    cin >> n;
    vector<vector<int>>array(n, vector<int>(n, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            cin >> array[i][j];
        }
    }
    vector<vector<int>> sum(n, vector<int>(n, 0));
    sum[0][0] = array[0][0];
    // left column
    for (int i = 1; i < n; i++) {
        sum[i][0] = sum[i - 1][0] + array[i][0];
    }

    // top row
    for (int i = 1; i < n; i++) {
        sum[0][i] = sum[0][i - 1] + array[0][i];
    }

    for (int i = 1; i < n; i++) {    
        for (int j = 1; j < n; j++) {
            sum[i][j] = array[i][j] + max(sum[i - 1][j], sum[i][j - 1]);
        }
    }

    vector<int> path_sequence;
    int i = n - 1, j = n - 1;
    path_sequence.push_back(array[i][j]);
    while (i > 0 || j > 0) {
        if (i == 0) {
            j--;
        } else if (j == 0) {
            i --;
        } else {
            if (sum[i][j] == sum[i - 1][j] + array[i][j]) {
                i -- ;
            } else {
                j--;
            }
        }
        path_sequence.push_back(array[i][j]);
    }
    reverse(path_sequence.begin(), path_sequence.end());
    int total = 0;
    int count = 0;
    for (int i = 0; i < path_sequence.size(); i++) {
        total += path_sequence[i];
        if (total < 0) {
            cout << "Bad Judges\n";
            return;
        }
        if (path_sequence[i] != 0) {
            count += 1;
        }
    }
    printf("%.9lf\n", (double) total / (double) count);
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
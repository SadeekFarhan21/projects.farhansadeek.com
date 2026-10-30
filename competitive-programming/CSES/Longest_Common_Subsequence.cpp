#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main(){
    int n, m; cin >> n >> m;
    vector <int> a(n);
    vector <int> b(m);
    for(int i = 0; i < n; i++){
        cin >> a[i];
    }
    for(int i = 0; i < m; i++){
        cin >> b[i];
    }
    vector <int> answer;
    int dp[n + 1][m + 1];
    for(int i = 0; i <= n; i++){
        for(int j = 0; j <= m; j++){
            dp[i][j] = 0;
        }
    } 
    for(int i = 1; i <= n; i++){
        for(int j = 1; j <= m; j++){
            if(a[i - 1] == b[j - 1]){
                dp[i][j] = 1 + dp[i - 1][j - 1];
            }
            else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    int i = n, j = m;
    while(i > 0 && j > 0){
        if(a[i - 1] == b[j - 1]){
            answer.push_back(a[i - 1]);
            i--;
            j--;
        }

        else if(dp[i - 1][j] > dp[i][j - 1]){
            i--;
        }
        else {
            j--;
        }
    }
    cout << answer.size() << "\n";
    for(int i = answer.size() - 1; i >= 0; i--){
        cout << answer[i] << " ";
    }
    return 0;
}
#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double
int mod = 1e9 + 7;
int32_t main(){
    int n; cin >> n;
    int answer[n + 1][n + 1];
    char matrix[n + 1][n + 1];
    for(int i = 0; i < n; i++){
        for(int j = 0; j < n; j++){
            answer[i][j] = 0;
        }
    }

    for(int i = 0; i < n; i++){
        for(int j = 0; j < n; j++){
            cin >> matrix[i][j];
            if(matrix[i][j] == '*'){
                answer[i][j] = 0;
            }
        }
    }
    bool found_star = false;
    for(int i = 0; i < n; i++){
        if(matrix[i][0] == '*'){
            found_star = true;
        }
        if(found_star){
            answer[i][0] = 0;
        }
        else {
            answer[i][0] = 1;
        }
    }

    found_star = false;
    for(int i = 0; i < n; i++){
        if(matrix[0][i] == '*'){
            found_star = true;
        }
        if(found_star){
            answer[0][i] = 0;
        }
        else {
            answer[0][i] = 1;
        }
    }
    
    for(int i = 1; i < n; i++){
        for(int j = 1; j < n; j++){
            if(matrix[i][j] != '*'){
                answer[i][j] = ((answer[i - 1][j] % mod + answer[i][j - 1] % mod)) % mod;
            }
        }
    }
    cout << answer[n - 1][n-1];
}
#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int mod(int a, int b){
    int remainder = a % b;
    if(remainder < 0){
        remainder += b;
    }
    return remainder;
}

void recursion(int r, int c, int n, int count, vector<vector<int>> &matrix){
    if(count > n * n){
        return;
    }

    matrix[r][c] = count;
    
    int next_r = mod(r - 1, n);
    int next_c = mod(c + 1, n);

    if(matrix[next_r][next_c] == -1){
        recursion(next_r, next_c, n, count + 1, matrix);
    }
    else {
        recursion(mod(r + 1, n), c, n, count + 1, matrix);   
    }
}

int32_t main(){
    int n; cin >> n;
    vector<vector<int>> matrix(n, vector <int> (n, -1));
    recursion(0, (n - 1) / 2, n, 1, matrix);
    for(int i = 0; i < n; i++){
        for(int j = 0; j < n; j++){
            cout << matrix[i][j] << " ";
        }
        cout << "\n";
    }    
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    vector<vector<int>> matrix {
        {1, 2, 3},
        {4, 5, 6},
        {7, 8, 9}
        
    };
    // Clockwise Rotate
    reverse(matrix.begin(), matrix.end());
    for(int i = 0; i < 3; i++){
        for(int j = 0; i < 3; j++){
            cout << matrix[i][j] << " ";
        }
        cout << endl;
    }
}
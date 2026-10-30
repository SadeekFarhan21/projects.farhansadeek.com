#include <bits/stdc++.h>
using namespace std;

char board[8][8];

bool canAttack(int r1, int c1, int r2, int c2) {
    // Check if queens can attack diagonally in both directions
    return (r1 == r2) || (c1 == c2) || (abs(r1 - r2) == abs(c1 - c2)) || (abs(r1 - r2) == abs(c2 - c1));
}

int main(){
    for(int i = 0; i < 8; i++){
        for(int j = 0; j < 8; j++){
            cin >> board[i][j];
        }
    }
    
    string ans = "valid";
    for(int i = 0; i < 8; i++){
        for(int j = 0; j < 8; j++){
            if(board[i][j] == '*'){
                for(int x = 0; x < 8; x++){
                    for(int y = 0; y < 8; y++){
                        if(board[x][y] == '*' && (i != x || j != y)){
                            if(canAttack(i, j, x, y)){
                                ans = "invalid";
                            }
                            
                        }
                    }
                }
            }
        }
    }
    cout << ans << "\n";
}
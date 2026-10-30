#include <bits/stdc++.h>
using namespace std;

int main(){
    int x, y; cin >> x >> y;
    int a[2][2];
    for(int i = 0; i < 2; i++){
        for(int j = 0; j < 2; j++){
            cin >> a[i][j];
        }
    }
    cout << a[x - 1][y - 1] << endl;
    return 0;
}
#include <bits/stdc++.h>
using namespace std;


int main(){
    freopen("pails.in", "r", stdin);
    freopen("pails.out", "w", stdout);
    
    int x, y, m; cin >> x >> y >> m;
    int answer = 0;
    for(int i = 0; i < 1000; i++){
        for(int j = 0; j < 1000; j++){
            int total = x * i + y * j;
            if(total <= m){
                answer = max(answer, total);
            }
        }
    }
    cout << answer << "\n";
}
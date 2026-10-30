#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
#define int long long

void solve(){
    int n, m, x, y; cin >> n >> m >> x >> y;
    vector <int> horizontal(n);
    vector <int> vertical(m);    
    for(int i = 0; i < n; i++){
        cin >> horizontal[i];
    }
    for(int i = 0; i < m; i++){
        cin >> vertical[i];
    }

    int x_direction = 0, y_direction = 0;
    for(int i = 0; i < n; i++){
        if(horizontal[i] <= y){
            y_direction++;
        }
    }
    for(int i = 0; i < m; i++){
        if(vertical[i] <= x){
            x_direction++;
        }
    }
    cout << x_direction + y_direction << "\n";
}

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main(){
    int n; cin >> n;
    vector <int> v(n);
    vector <int> cost(n + 1);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    cost[0] = 0;
    cost[1] = abs(v[1] - v[0]);
    cost[2] = min(abs(v[2] - v[0]), abs(v[0] - v[1]) + abs(v[2] - v[1]));
    for(int i = 3; i < n; i++){
        cost[i] = min(cost[i - 1] + abs(v[i] - v[i - 1]), cost[i - 2] + abs(v[i] - v[i - 2]));
    }
    cout << cost[n - 1] << "\n";
    return 0;
}
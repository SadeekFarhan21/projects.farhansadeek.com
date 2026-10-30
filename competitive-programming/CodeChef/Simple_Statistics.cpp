#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n, k; cin >> n >> k;
    vector <double> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.begin(), v.end());

    double sum = 0;
    for(int i = k; i < n - k; i++){
        sum += v[i];
    }
    double count = n - (2 * k);
    if(sum == 0 || count == 0) cout << 0 << "\n";
    double answer = sum / count;
    printf("%.6lf\n", answer);
    return;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
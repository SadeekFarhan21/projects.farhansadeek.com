#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    int result = 0;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }

    for(int i = 0; i < n; i++){
        result ^= v[i];
    }
    for(int i = 0; i < n; i++){
        result ^= i;
    }
    cout << result << "\n";
    return 0;
}
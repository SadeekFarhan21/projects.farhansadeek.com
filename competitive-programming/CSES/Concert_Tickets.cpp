#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, m; cin >> n >> m;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    for(int i = 0; i < m; i++){
        int a; cin >> a;
        if(binary_search(v.begin(), v.end(), a)){
            cout << a << "\n";
            v.erase(    )
        }
    }

    return 0;
}
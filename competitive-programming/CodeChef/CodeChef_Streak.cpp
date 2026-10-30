#include <bits/stdc++.h>
using namespace std;

void solve(){
    int m1 = INT_MIN;
    int m2 = INT_MIN;
    int c1 = 0;
    int c2 = 0;
    int n; cin >> n;
    vector <int> a(n);
    vector <int> b(n);
    for(int i = 0; i < n; i++){
        cin >> a[i];
        if(a[i] >= 1){
            c1 += 1;
            m1 = max(m1, c1);
        }
        else {
            c1 = 0;
        }
    }
    
    for(int i = 0; i < n; i++){
        cin >> b[i];
        if(b[i] > 0){
            c2 += 1;
            m2 = max(m2, c2);
        }
        else {
            c2 = 0;
        }
    }
    if(m1 == m2) cout << "Draw" << "\n";
    else if(m1 > m2) cout << "Om" << "\n";
    else if(m1 < m2) cout << "Addy" << "\n";
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        solve();
    }
    return 0;
}
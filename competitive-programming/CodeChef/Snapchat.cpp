#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> a(n);
    vector <int> b(n);
    for(int i = 0; i < n; i++){
        cin >> a[i];
    }
    for(int j = 0; j < n; j++){
        cin >> b[j];
    }
    int count = 0;
    int answer = 0;
    for(int i = 0; i < n; i++){
        if(a[i] == 0 || b[i] == 0){
            count = 0;
        }
        else {
            count++;
        }
        answer = max(count, answer);
    }
    cout << answer << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
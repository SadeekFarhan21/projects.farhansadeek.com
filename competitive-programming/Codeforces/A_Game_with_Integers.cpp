#include <bits/stdc++.h>
using namespace std;

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        long long n; cin >> n;
        if(n % 3 == 0) cout << "Second" << "\n";
        else cout << "First" << "\n";
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    freopen("breedflip.in", "r", stdin);
    freopen("breedflip.out", "w", stdout);
    
    int n; cin >> n;
    string x, y; cin >> x >> y;
    vector <char> a(x.begin(), x.end());
    vector <char> b(y.begin(), y.end());
    int count = 0;
    for(int i = 0; i < n; i++){
        int trace = 0;
        for(int j = i; i < n - i; j++){
            if(a[j] != b[j]){
                trace++;
            }
            else {
                i += trace;
                count++;
            }
        }
    }
    cout << count << "\n";
}
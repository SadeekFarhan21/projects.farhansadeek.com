#include <bits/stdc++.h>
using namespace std;
#define ull unsigned long long

ull arr[100000000];

int main(){
    int q; cin >> q;
    map <ull, ull> m;
    for(int i = 0; i < q; i++){
        ull c, k; cin >> c >> k;
        if(c == 0){
            ull v; cin >> v;
            m[k] = v;
        }
        else if(c == 1){
            cout << m[k] << "\n";
        }
    }
    return 0;
}
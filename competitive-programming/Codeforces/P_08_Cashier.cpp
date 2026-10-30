#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, L, a; cin >> n >> L >> a;
    vector <int> v(L + 1, 0);
    for(int i = 0; i < n; i++){
        int s, e; cin >> s >> e;
        for(int j = s; j <= e; j++){
            v[j] = 1;
        }
    }
    int count = 0;
    int currentZeros = 0;
    for(int i = 1; i < v.size(); i++){
        if(v[i] == 0){
            currentZeros++;
        } else {
            currentZeros = 0;
        }
        if(currentZeros == a){
            count++;
            currentZeros = 0;
        }
    }
    cout << count << "\n";
    return 0;
}
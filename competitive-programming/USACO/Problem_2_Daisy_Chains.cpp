#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    int l = 0;
    int r = 0;
    int answer = 0;
    while(l < n || r < n){
        if(v[l] == v[r]){
            answer++;
            l = r;
            r += 1;
        }
        l++;
        r++;
    }
    cout << answer << "\n";
}
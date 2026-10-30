#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, k; cin >> n >> k;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        int a; cin >> a;
        v[i] = 5 - a;
    }
    sort(v.begin(), v.end());
    int answer = 0;
    for(int i = 0; i < n; i++){
        if(v[i] >= k){
            answer++;
        }
    }
    cout << answer / 3 << "\n";
    return 0;
}
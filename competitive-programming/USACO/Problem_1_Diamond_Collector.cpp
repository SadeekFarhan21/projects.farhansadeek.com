#include <bits/stdc++.h>
using namespace std;

int main(){
    freopen("diamond.in", "r", stdin);
    freopen("diamond.out", "w", stdout);
    int n, k; cin >> n >> k;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    int answer = 0;
    for(int i = 0; i < n; i++){
        int count = 0;
        for(int j = i; j < n; j++){
            if(v[j] - v[i] <= k){
                count++;
                answer = max(answer, count);
            }
        }
    }
    cout << answer << "\n";
    return 0;
}
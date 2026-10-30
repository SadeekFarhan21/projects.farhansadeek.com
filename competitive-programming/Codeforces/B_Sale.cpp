#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, k; cin >> n >> k;
    vector <int> v;
    for(int i = 0; i < n; i++){
        int a; cin >> a;
        if(a < 0){
            v.push_back(a);
        }
    }
    sort(v.begin(), v.end());
    if(v.size() < k){
        cout << -1 * accumulate(v.begin(), v.end(), 0);
        return 0;
    }
    vector <int> s(v.begin(), v.begin() + k);
    cout << -1 * accumulate(s.begin(), s.end(), 0);
    return 0;
}
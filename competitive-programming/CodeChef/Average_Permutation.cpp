#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 1; i <= n; i++){
        v[i - 1] = i;
    }
    sort(v.rbegin(), v.rend());
    deque <int> dq;
    for(int i = 0; i < n; i++){
        if(i % 2 == 0){
            dq.push_back(v[v.size() - 1]);
            v.pop_back();
        }
        else {
            dq.push_front(v[v.size() - 1]);
            v.pop_back();
        }
    } 
    for(auto i : dq){
        cout << i << " ";
    }
    cout << '\n';
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
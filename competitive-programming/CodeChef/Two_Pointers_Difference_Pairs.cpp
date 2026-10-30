#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n, d; cin >> n >> d;
    vector <int> v(n);
    for(int i = 0; i < n; i++) cin >> v[i];
    sort(v.begin(), v.end());
    int left = 0, right = n;
    while(left <= right){
        if(abs(v[left] - v[right]) < d){
            cout << 0 << "\n";
            return;
        }
        else if(abs(v[left] - v[right]) == d) {
            cout << 1 << "\n"; 
            return;
        }
        else if(abs(v[left] - v[right - 1]) > abs(v[left + 1] - v[right])){
            left++;
        }
        else {
            right--;
        }
    }
    cout << 0 << "\n";
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++) solve();
    return 0;
}
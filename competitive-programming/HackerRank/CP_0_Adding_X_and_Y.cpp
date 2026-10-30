#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main(){
    int n; cin >> n;
    ll a = 0; ll b = 0;
    for(int i = 0; i < n; i++){
        int x; cin >> x;
        a *= 10;
        a += x;
    }    
    for(int i = 0; i < n; i++){
        int x; cin >> x;
        b *= 10;
        b += x;
    }
    string answer = to_string(a + b);
    if(answer.size() > n){
        cout << "Overflow!" << "\n";
        return 0;
    }
    for(int i = 0; i < answer.size(); i++){
        cout << answer[i] << " ";
    }
    cout << "\n";
}
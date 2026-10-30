#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    int a, b; cin >> a >> b;
    int answer = 0;
    for(int i = a; i <= b; i++){
        answer += v[i];
    }
    cout << answer << "\n";
    return 0;
}
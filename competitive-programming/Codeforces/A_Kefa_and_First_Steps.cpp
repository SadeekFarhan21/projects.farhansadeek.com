#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    int count = 1;
    int answer = 1;
    for(int i = 1; i < n; i++){
        if(v[i - 1] <= v[i]){
            count++;
            answer = max(answer, count);
        }
        else {
            count = 1;
        }
    }
    cout << answer << "\n";
}
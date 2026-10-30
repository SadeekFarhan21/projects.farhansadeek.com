#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, x; cin >> n >> x;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    int answer = 0;
    int i = 0, j = n - 1;
    while(i < j){
        if(v[i] + v[j] <= x){
            answer++;
            i++;
            j--;
        }
        else if(v[i] + v[j] > x){
            j--;
        }   
    }
    cout << answer << "\n";
}
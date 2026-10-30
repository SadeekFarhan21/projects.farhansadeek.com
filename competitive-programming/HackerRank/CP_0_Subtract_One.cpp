#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    string s = "";
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
        s += to_string(v[i]);
    }
    if(stol(s) == 0){
        for(auto c : s){
            cout << '9' << " "; 
        }
    }
    else {
        string answer = to_string(stol(s) - 1);
        int size = n - to_string(stol(s) - 1).size();
        for(int i = 0; i < size; i++){
            cout << '0' << ' ';
        }
        for(int i = 0; i < answer.size(); i++){
            cout << answer[i] << " ";
        }
    }
    return 0;
}
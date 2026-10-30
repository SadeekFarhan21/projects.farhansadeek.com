#include <bits/stdc++.h>
using namespace std;

int main(){
    string s; cin >> s;
    int count = 0;
    unordered_map <char, int> map;
    for(char i : s){
        map[i] += 1;
    }

    for(char i : s){
        if(map[i] == 1){
            cout << i << endl;
            count += 1;
            break;
        }
    }
    if(count == 0) cout << "-1\n";
    return 0;
}
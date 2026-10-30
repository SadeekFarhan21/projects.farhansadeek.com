#include <bits/stdc++.h>
using namespace std;

map <string, int> m;

int main(){
    string s; getline(cin, s);
    while(s != "***"){
        m[s]++;
        getline(cin, s);
    }
    int max = INT_MIN;
    string winner; 
    for(auto x : m){
        if(max < x.second){
            max = x.second;
            winner = x.first;
        }
    }
    int count = 0;
    for(auto x : m){
        if(x.second == max){
            count++;
        }
    }
    if(count != 1){
        cout << "Runoff!" << "\n";
        return 0;
    }
    cout << winner << "\n";
}
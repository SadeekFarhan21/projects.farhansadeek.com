#include <bits/stdc++.h>
using namespace std;


int main(){
    int w, p; cin >> w >> p;
    vector <int> v;
    v.push_back(0); v.push_back(w);
    for(int i = 0; i < p; i++){
        int a; cin >> a;
        v.push_back(a);
    }

    vector <int> temp;
    for(int i = 0; i < v.size(); i++){
        for(int j = 0; j < v.size(); j++){
            temp.push_back(v[i] - v[j]);
            // cout << v[i] - v[j] << " ";
        }
    }

    set <int> answer(temp.begin(), temp.end());
    for(int x : answer){
        if(x > 0){
            cout << x << " ";
        }
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int canCheat(int a, int b){
    int answer = 0;
    for(int i = 1; i <= max(a, b); i++){
        if((a - 1) % i == (b - 1) % i){
            answer++;
        }
    }
    return answer;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        int a, b; cin >> a >> b;
        cout << canCheat(a, b) << "\n";
    }
    return 0;
}
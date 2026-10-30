#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, t; cin >> n >> t;
    int time = 240 - t;
    int total_time = 0;
    int answer = 0;
    for(int i = 0; i < 240; i++){
        total_time += i * 5;
        if(total_time > time){
            answer = i - 1;
            break;
        }
    }
    cout << min(answer, n) << "\n";
    return 0;
}
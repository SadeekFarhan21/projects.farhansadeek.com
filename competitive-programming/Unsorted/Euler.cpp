#include <bits/stdc++.h>
using namespace std;

map <long long, long long> m;
int steps = 1;
long long size(int n){
    if(m.find(n) != m.end()){
        return m[n];
    }

    int start = n;
    while(n != 1){
        if(n % 2 == 0){
            n /= 2;
        }
        else {
            n = 3 * n + 1;
        }
        steps++;
        if (m.find(n) != m.end()) {
            steps += m[n] - 1;
            break;
        }
    }
    m[start] = steps;
    return m[start];
}

int main(){
    int highest = 0;
    int answer = 0;
    for(int i = 1; i <= 1e6; i++){
        int output = size(i);
        if(output >= highest){
            highest = output;
            answer = i;
        }
    }
    cout << answer << "\n";
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    long long n; cin >> n;
    long long answer = LLONG_MAX;
    map <int, pair<int, int>> m; 
    for(int i = 1; i <= sqrt(n); i++){
        if(n % i == 0){
            answer = min(answer, 2 * (i + n / i));
        }
    }
    cout << answer << "\n";
}
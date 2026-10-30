#include <bits/stdc++.h>
using namespace std;

int main(){
    int n, m; cin >> n >> m;
    int count = n;
    int days = 1;
    while(count != 0){
        if(days % m == 0){
            count++;
        }
        count -= 1;
        days += 1;
    }
    cout << days - 1 << "\n";
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    int a, b; cin >> a >> b;
    if(max(a, b) % min(a, b) == 0){
        cout << "Multiples" << "\n";
        return 0;
    }
    cout << "No Multiples" << "\n";
    return 0;
}
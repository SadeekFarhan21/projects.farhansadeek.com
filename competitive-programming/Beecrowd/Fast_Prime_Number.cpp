#include <bits/stdc++.h>
using namespace std;


int main(){
    int t; // Number of test cases
    cin >> t;

    for(int i = 0; i < t; i++){
        int n;
        cin >> n;
        cout << solve(n) << "\n";
    }

    return 0;
}

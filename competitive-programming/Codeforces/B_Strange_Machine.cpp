#include "bits/stdc++.h"
using namespace std;
#define int long long int

void solve(){
    int n, q; cin >> n >> q;
    vector <char> machines(n);
    vector <int> queries(q);
    vector <int> answer(q);
    for(int i = 0; i < n; i++){
        cin >> machines[i];
    }
    for(int i = 0; i < q; i++){
        cin >> queries[i];
    }

    for(int i = 0; i < q; i++){
        int number = queries[i];
        int counter = 0;
        int j = 0;
        while(number > 0){
            char operation = machines[j];
            if(operation == 'B'){
                number /= 2;
                counter += 1;
            }
            else if(operation == 'A'){
                number -= 1;
                counter += 1;
            }
            j++;
            j %= n;    
        }
        cout << counter << "\n";
    }
}


int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    int d; cin >> d;
    int count1 = 0;
    int count2 = 0;
    vector <int> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i];
    }

    sort(v.begin(), v.end());
    
    int count = 0;
    for(int i = 0; i < n - 1; ){
        if(abs(v[i] - v[i + 1]) <= d){
            count += 1;
            i += 2;
        }
        else {
            i++;
        }
    }   

    cout << count << "\n";
    return 0;
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    int t; cin >> t;
    int min_ind, max_ind;
    vector <int> v(t);
    for(int i = 0; i < t; i++){
        cin >> v[i];
    }
    
    int mini = *min_element(v.begin(), v.end());
    int maxi = *max_element(v.begin(), v.end());
    // reverse(v.begin(), v.end());
    for(int i = 0; i < t; i++){
        if(mini == v[i]){
            min_ind = t - i;
            break;
        }
    }

    for(int i = 0; i < t; i++){
        if(maxi == v[i]){
            max_ind = t - i;
            break;
        }
    }
    int ans = max_ind + min_ind - 2;
    cout << ans << endl;
    return 0;
}
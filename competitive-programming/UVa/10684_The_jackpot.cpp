#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main(){
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n; 
    while(cin >> n && n != 0){
        vector<int> v(n);
        for(int i = 0; i <n; i++){
            cin >> v[i];
        }

        int answer = 0;
        int current = 0;
        for(int i = 0; i < n; i++){
            current += v[i];
            if(current < 0){
                current = 0;
            }
            answer = max(answer, current);
        }

        if(answer <= 0){
            cout << "Losing streak.\n";
        } else {
            cout << "The maximum winning streak is " << answer << ".\n";
        }
    }
    return 0;
}
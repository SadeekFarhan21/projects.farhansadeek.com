#include <bits/stdc++.h>
using namespace std;

void solve(){
    int a, b; cin >> a >> b;
    for(int i = a; i <= b; i++){
        bool prime = true;
        for(int j = 2; j <= sqrt(i); j++){
            if(i % j == 0){
                prime = false;
                break;
            }
        }
        if(prime && i != 1){
            cout << i << "\n";
        }
    }
    cout << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}

/*

int main(){
    int limit = INT_MIN;
    int n; cin >> n;
    vector <pair<int, int>> v(n);
    for(int i = 0; i < n; i++){
        cin >> v[i].first >> v[i].second;
        limit = max(limit, v[i].second);
    }
    vector <bool> is_prime(limit + 1, true);
    is_prime[0] = is_prime[1] = false;
    for(int i = 2; i * i <= limit; i++){
        if(is_prime[i]){
            for(int j = i * i; j <= limit; j += i){
                is_prime[j] = false;
            }
        }
    }
    for(auto x : v){
        for(int i = x.first; i <= x.second; i++){
            if(is_prime[i]){
                cout << i << "\n";
            }
        }
        cout << '\n';
    }
}

*/
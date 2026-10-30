#include "bits/stdc++.h"
using namespace std;

map <int, vector <pair <int, int>>> m;

vector<pair<int, int>> primeFactorization(int n) {
    vector<pair<int, int>> factors;

    int count = 0;
    while (n % 2 == 0) {
        count++;
        n /= 2;
    }
    if (count > 0)
        factors.push_back({2, count});

    for (int i = 3; i * i <= n; i += 2) {
        count = 0;
        while (n % i == 0) {
            count++;
            n /= i;
        }
        if (count > 0)
            factors.push_back({i, count});
    }

    if (n > 1) {
        factors.push_back({n, 1});
    }

    return factors;
}

int32_t main(){
    for(int i = 1; i <= 1000; i++){
        vector<pair<int, int>> factors = primeFactorization(i);
        map.insert({i, factors});
    }
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        int n; cin >> n;
        vector <pair<int, int>> factors = m[i];
        for(auto x : factors){
            cout << x.first << " " << x.second << "\n";
        }
    }
    return 0;
}
#include "bits/stdc++.h"
using namespace std;
#define int long long 
#define double long double

int32_t main(){
    int n; string s; cin >> n >> s;
    int count = n - s.size();
    for(int i = 0; i < count; ++i) cout << 'o';
    cout << s << '\n';
}
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
    vector<pair<int, int>> v;
    for(int i = 0; i < 5; i++){
        int a, b, c, d; cin >> a >> b >> c >> d;
        v.push_back({i + 1, a + b + c + d});
    }
    sort(v.rbegin(), v.rend(),[&](const auto&a, const auto&b){
        return a.second < b.second;
    });

    cout << v[0].first << " " << v[0].second;
}
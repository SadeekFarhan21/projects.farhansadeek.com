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
    int n; cin >> n;
   vector<pair<int, int>> movies(n) ;
   for(int i = 0; i <n; i++){
    cin >> movies[i].first >> movies[i].second;
   }
   sort(movies.begin(), movies.end(), [](const pair<int, int> &a, const pair <int, int> &b){
    return a.second < b.second;
   });
   int current_end_time = 0, count = 0;
   for(auto &[start_time, end_time]: movies){
        if(start_time >= current_end_time){
            count += 1;
            current_end_time = end_time;
        }
   }
    cout << count << "\n";
    return 0;
}
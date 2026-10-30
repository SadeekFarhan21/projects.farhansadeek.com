#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>

using namespace std;
using namespace __gnu_pbds;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    vector<pair<int, int>> v;
    for (int i = 0; i < n; i++) {
        int start, end;
        cin >> start >> end;
        v.push_back({start, 1});
        v.push_back({end, -1});
    }
    sort(v.begin(), v.end());
    int answer = 0, current = 0;
    for(auto &event : v){
        current += event.second;
        answer = max(answer, current);
    }
    cout << answer << "\n";
    return 0;
}
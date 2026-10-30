#include <iostream>
#include <vector>
using namespace std;
#define int long long

void solve() {
    int n, m; cin >> n >> m;
    vector<pair<int,int>> conditions(n);
    for(int i = 0; i < n; i++) {
        cin >> conditions[i].first >> conditions[i].second;
    }

    int answer = 0;
    int current_time = 0;
    int current_location = 0;

    for(int i = 0; i < n; i++) {
        int requirement_time = conditions[i].first;
        int required_location = conditions[i].second;
        int time_available = requirement_time - current_time;

        if(current_location == required_location) {
            if(time_available % 2 == 0) answer += time_available;
            else answer += time_available - 1;
        } else {
            if(time_available % 2 == 1) answer += time_available;
            else answer += time_available - 1;
        }

        current_time = requirement_time;
        current_location = required_location;
    }
    
    answer += (m - current_time);

    cout << answer << "\n";
}

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t; cin >> t;
    while(t--) solve();
}
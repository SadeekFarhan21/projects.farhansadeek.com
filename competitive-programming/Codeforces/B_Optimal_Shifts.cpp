#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int get_max_gap(int n, const vector<int>& p) {
    if (p.empty()) return n; 
    int max_g = 0;
    int sz = p.size();
    for (int i = 0; i < sz; ++i) {
        int curr = p[i];
        int next = p[(i + 1) % sz];
        int gap = (next - curr - 1 + n) % n;
        max_g = max(max_g, gap);
    }
    return max_g;
}

void solve() {
    int n;
    cin >> n;
    string s;
    cin >> s;

    vector<int> ones;
    ones.reserve(n);
    for (int i = 0; i < n; ++i) {
        if (s[i] == '1') {
            ones.push_back(i);
        }
    }

    if (ones.size() == n) {
        cout << 0 << "\n";
        return;
    }

    int initial_max_gap = get_max_gap(n, ones);
    int ans = initial_max_gap;

    int limit = sqrt(n) + 2;

    for (int d = 1; d < ans && d <= limit; ++d) {
        vector<int> current_ones = ones;
        current_ones.reserve(2 * ones.size());
        for (int x : ones) {
            current_ones.push_back((x + d) % n);
        }
        sort(current_ones.begin(), current_ones.end());
        auto last = unique(current_ones.begin(), current_ones.end());
        current_ones.erase(last, current_ones.end());
        
        int new_gap = get_max_gap(n, current_ones);
        ans = min(ans, d + new_gap);
    }

    cout << ans << "\n";
}

int32_t main() {
    ios_base::sync_with_stdio(0); cin.tie(0);
    int t; cin >> t;
    for(int i = 0; i < t; i++) {
        solve();
    }
    
    return 0;
}
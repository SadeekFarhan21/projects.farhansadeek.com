#include <bits/stdc++.h>
using namespace std;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, k;
    cin >> n >> k;
    set<pair<int, int>> s; // {-frequency, number}
    map<int, int> m;       // {number, frequency}

    vector<int> v(1e7 + 1);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }

    for (int i = 0; i < k; i++) {
        m[v[i]]++;
    }
    for (auto x : m) {
        s.insert({-x.second, x.first});
    }
    cout << m.size() << " ";

    for (int i = k; i < n; i++) {
        // remove the the element at [i - k]
        s.erase({-m[v[i - k]], v[i - k]});
        m[v[i - k]]--;
        if (m[v[i - k]] > 0) {
            s.insert({-m[v[i - k]], v[i - k]});
        } else {
            m.erase(v[i - k]);
        }

        // insert the new element
        if (m[v[i]] > 0) { // already exists
            s.erase({-m[v[i]], v[i]});
            m[v[i]]++;
            s.insert({-m[v[i]], v[i]});

        } else {
            // adding for the first time
            m[v[i]]++;
            s.insert({-m[v[i]], v[i]});
        }
        cout << m.size() << " ";
    }
    return 0;
}
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
    vector<int> v(n);
    // taking input
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    vector<int> freq(k + 1, 0);
    set<int> missing;

    // before anything, everything is missing
    for (int i = 0; i <= k; i++) {
        missing.insert(i);
    }
    // helper function
    auto add = [&](int x) {
        if (x <= k) {
            if (freq[x] == 0) {
                missing.erase(x);
            }
            freq[x]++;
        }
    };

    // helper remove
    auto remove = [&](int x) {
        if (x <= k) {
            freq[x]--;
            if (freq[x] == 0) {
                missing.insert(x);
            }
        }
    };
    // first k elements
    for (int i = 0; i < k; i++) {
        add(v[i]);
    }
    cout << *missing.begin() << " ";

    // now processing one element at a time
    for (int i = k; i < n; i++) {
        remove(v[i - k]);
        add(v[i]);
        cout << *missing.begin() << " ";
    }
    return 0;
}
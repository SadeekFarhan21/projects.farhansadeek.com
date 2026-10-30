#include <bits/stdc++.h>
using namespace std;
int32_t main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int x, n;
    cin >> x >> n;
    set<int> lights = {0, x};
    multiset<int> passages = {x};
    for (int i = 0; i < n; i++) {
        int p;
        cin >> p;
        auto upper = lights.upper_bound(p);
        auto lower = prev(upper);

        int left = *lower;
        int right = *upper;

        passages.erase(passages.find(right - left));
        passages.insert(right - p);
        passages.insert(p - left);
        lights.insert(p);

        cout << *passages.rbegin() << " ";
    }
    return 0;
}
#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

signed main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, x;
    cin >> n >> x;
    vector<pair<int, int>> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i].first;
        v[i].second = i + 1;
    }
    sort(v.begin(), v.end());
    for (int i = 0; i < n - 1; i++) {
        int target = x - v[i].first;
        int left = i + 1, right = n - 1;
        while (left < right) {
            if (v[left].first + v[right].first == target) {
                cout << v[i].second << " " << v[left].second << " " << v[right].second << '\n';
                return 0;
            } else if (v[left].first + v[right].first > target) {
                right--;
            } else {
                left++;
            }
        }
    }
    cout << "IMPOSSIBLE\n";
    return 0;
}
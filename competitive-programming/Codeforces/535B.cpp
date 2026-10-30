#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n;
    cin >> n;
    queue<int> q;
    q.push(4);
    q.push(7);
    vector<int> v;
    while (!q.empty()) {
        int element = q.front();
        q.pop();
        v.push_back(element);
        int next_4 = element * 10 + 4;
        int next_7 = element * 10 + 7;

        if (next_4 <= 1e9) {
            q.push(next_4);
        }
        if (next_7 <= 1e9) {
            q.push(next_7);
        }
    }

    sort(v.begin(), v.end());
    auto it = find(v.begin(), v.end(), n);
    cout << distance(v.begin(), it) + 1 << '\n';
    return 0;
}
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
    vector<int> main(2 * n);
    for (int i = 0; i < 2 * n; i++) {
        cin >> main[i];
    }

    stack<int> aux;
    int answer = 0;
    for (int i = 0; i < 2 * n; i++) {
        if (!aux.empty() && aux.top() == main[i]) {
            aux.pop();
        } else {
            aux.push(main[i]);
        }
        answer += 1;
    }
    if (aux.size() > 0) {
        cout << "impossible\n";
    } else {
        cout << answer << '\n';
    }
    return 0;
}
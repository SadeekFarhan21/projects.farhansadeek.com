#include <bits/stdc++.h>
using namespace std;
#define int long long

// 1-indexed Fenwick tree (BIT) for sums.
struct Fenwick {
    int n;
    vector<int> tree;

    Fenwick(int n) : n(n), tree(n + 1, 0) {}

    // build from a 1-indexed array (a[0] ignored) in O(n)
    Fenwick(const vector<int> &a) : n(a.size() - 1), tree(a) {
        tree[0] = 0;
        for (int i = 1; i <= n; i++) {
            int j = i + (i & -i);
            if (j <= n) {
                tree[j] += tree[i];
            }
        }
    }

    // a[i] += delta
    void add(int i, int delta) {
        for (; i <= n; i += i & -i) {
            tree[i] += delta;
        }
    }

    // a[1] + ... + a[i]
    int query(int i) {
        int sum = 0;
        for (; i > 0; i -= i & -i) {
            sum += tree[i];
        }
        return sum;
    }

    // a[l] + ... + a[r]
    int query(int l, int r) {
        if (l > r) {
            return 0;
        }
        return query(r) - query(l - 1);
    }

    // smallest i with query(i) >= k, or n + 1 if none (all values must be >= 0)
    int lower_bound(int k) {
        int pos = 0;
        for (int step = __lg(n + 1); step >= 0; step--) {
            int next = pos + (1LL << step);
            if (next <= n && tree[next] < k) {
                pos = next;
                k -= tree[next];
            }
        }
        return pos + 1;
    }
};

// Range update, point query: add to a whole range, read one value.
// Stores differences, so point(i) = sum of the differences up to i.
struct RangeFenwick {
    Fenwick fw;

    RangeFenwick(int n) : fw(n + 1) {}

    // a[l..r] += delta
    void add(int l, int r, int delta) {
        fw.add(l, delta);
        fw.add(r + 1, -delta);
    }

    // a[i]
    int point(int i) {
        return fw.query(i);
    }
};

// Example: CSES Dynamic Range Sum Queries
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, q;
    cin >> n >> q;
    vector<int> v(n + 1);
    for (int i = 1; i <= n; i++) {
        cin >> v[i];
    }
    Fenwick fw(v);
    while (q--) {
        int t;
        cin >> t;
        if (t == 1) {
            int k, u;
            cin >> k >> u;
            fw.add(k, u - v[k]);
            v[k] = u;
        } else {
            int a, b;
            cin >> a >> b;
            cout << fw.query(a, b) << "\n";
        }
    }
}

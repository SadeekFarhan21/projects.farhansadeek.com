#include <bits/stdc++.h>
using namespace std;
#define int long long

// 1-indexed segment tree: point set, range query.
// Change ID and merge() to switch the operation:
//   min: ID = LLONG_MAX, min(a, b)
//   max: ID = LLONG_MIN, max(a, b)
//   sum: ID = 0,         a + b
//   gcd: ID = 0,         gcd(a, b)
//   xor: ID = 0,         a ^ b
struct SegTree {
    const int ID = LLONG_MAX;
    int merge(int a, int b) {
        return min(a, b);
    }

    int n;
    vector<int> tree;

    SegTree(int n) : n(n), tree(4 * n, ID) {}

    // build from a 1-indexed array (a[0] ignored) in O(n)
    SegTree(const vector<int> &a) : n(a.size() - 1), tree(4 * n, ID) {
        build(1, 1, n, a);
    }

    void build(int node, int l, int r, const vector<int> &a) {
        if (l == r) {
            tree[node] = a[l];
            return;
        }
        int mid = (l + r) / 2;
        build(2 * node, l, mid, a);
        build(2 * node + 1, mid + 1, r, a);
        tree[node] = merge(tree[2 * node], tree[2 * node + 1]);
    }

    void update(int node, int l, int r, int i, int val) {
        if (l == r) {
            tree[node] = val;
            return;
        }
        int mid = (l + r) / 2;
        if (i <= mid) {
            update(2 * node, l, mid, i, val);
        } else {
            update(2 * node + 1, mid + 1, r, i, val);
        }
        tree[node] = merge(tree[2 * node], tree[2 * node + 1]);
    }

    int query(int node, int l, int r, int ql, int qr) {
        if (qr < l || r < ql) {
            return ID;
        }
        if (ql <= l && r <= qr) {
            return tree[node];
        }
        int mid = (l + r) / 2;
        return merge(query(2 * node, l, mid, ql, qr), query(2 * node + 1, mid + 1, r, ql, qr));
    }

    // a[i] = val
    void update(int i, int val) {
        update(1, 1, n, i, val);
    }

    // merge of a[l..r]; returns ID if l > r
    int query(int l, int r) {
        return query(1, 1, n, l, r);
    }
};

// 1-indexed lazy segment tree: range add, range sum and range min.
struct LazySegTree {
    int n;
    vector<int> sum, mn, lazy;

    LazySegTree(int n) : n(n), sum(4 * n, 0), mn(4 * n, 0), lazy(4 * n, 0) {}

    // build from a 1-indexed array (a[0] ignored) in O(n)
    LazySegTree(const vector<int> &a) : LazySegTree((int)a.size() - 1) {
        build(1, 1, n, a);
    }

    void build(int node, int l, int r, const vector<int> &a) {
        if (l == r) {
            sum[node] = mn[node] = a[l];
            return;
        }
        int mid = (l + r) / 2;
        build(2 * node, l, mid, a);
        build(2 * node + 1, mid + 1, r, a);
        pull(node);
    }

    void apply(int node, int l, int r, int delta) {
        sum[node] += delta * (r - l + 1);
        mn[node] += delta;
        lazy[node] += delta;
    }

    void push(int node, int l, int r) {
        if (lazy[node] != 0) {
            int mid = (l + r) / 2;
            apply(2 * node, l, mid, lazy[node]);
            apply(2 * node + 1, mid + 1, r, lazy[node]);
            lazy[node] = 0;
        }
    }

    void pull(int node) {
        sum[node] = sum[2 * node] + sum[2 * node + 1];
        mn[node] = min(mn[2 * node], mn[2 * node + 1]);
    }

    void add(int node, int l, int r, int ql, int qr, int delta) {
        if (qr < l || r < ql) {
            return;
        }
        if (ql <= l && r <= qr) {
            apply(node, l, r, delta);
            return;
        }
        push(node, l, r);
        int mid = (l + r) / 2;
        add(2 * node, l, mid, ql, qr, delta);
        add(2 * node + 1, mid + 1, r, ql, qr, delta);
        pull(node);
    }

    int query_sum(int node, int l, int r, int ql, int qr) {
        if (qr < l || r < ql) {
            return 0;
        }
        if (ql <= l && r <= qr) {
            return sum[node];
        }
        push(node, l, r);
        int mid = (l + r) / 2;
        return query_sum(2 * node, l, mid, ql, qr) + query_sum(2 * node + 1, mid + 1, r, ql, qr);
    }

    int query_min(int node, int l, int r, int ql, int qr) {
        if (qr < l || r < ql) {
            return LLONG_MAX;
        }
        if (ql <= l && r <= qr) {
            return mn[node];
        }
        push(node, l, r);
        int mid = (l + r) / 2;
        return min(query_min(2 * node, l, mid, ql, qr), query_min(2 * node + 1, mid + 1, r, ql, qr));
    }

    // a[l..r] += delta
    void add(int l, int r, int delta) {
        add(1, 1, n, l, r, delta);
    }

    // a[l] + ... + a[r]
    int query_sum(int l, int r) {
        return query_sum(1, 1, n, l, r);
    }

    // min(a[l..r])
    int query_min(int l, int r) {
        return query_min(1, 1, n, l, r);
    }
};

// Example: CSES Dynamic Range Minimum Queries
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
    SegTree st(v);
    while (q--) {
        int t;
        cin >> t;
        if (t == 1) {
            int k, u;
            cin >> k >> u;
            st.update(k, u);
        } else {
            int a, b;
            cin >> a >> b;
            cout << st.query(a, b) << "\n";
        }
    }
}

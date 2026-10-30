#include <bits/stdc++.h>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;

template <typename T> using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;
#define int long long
#define double long double
vector<int> pw;
int mod = 1e9 + 7;
void precompute(int n) {
    pw.resize(n + 1);
    pw[0] = 1;
    for (int i = 1; i < n; i++) {
        pw[i] = (pw[i - 1] % mod * p % mod) % mod;
    }
}

int get_hash()
int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    string s;
    cin >> s;
    precompute(s.size());

    int q;
    cin >> q;
    vector<int> hash(s.size());
}
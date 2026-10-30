#include <bits/stdc++.h>
#include <boost/multiprecision/cpp_int.hpp>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace std;
using namespace __gnu_pbds;
using boost::multiprecision::cpp_int;
#define int cpp_int
#define double long double

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int val;
    while (cin >> val) {
        vector<int> v;
        while (val != -999999) {
            v.push_back(val);
            cin >> val;
        }
        if (v.empty())
            continue;
        int max_so_far = v[0];
        int min_so_far = v[0];
        int result = v[0];

        for (size_t i = 1; i < v.size(); i++) {
            if (v[i] < 0) {
                swap(max_so_far, min_so_far);
            }
            max_so_far = max(max_so_far * v[i], v[i]);
            min_so_far = min(min_so_far * v[i], v[i]);
            result = max(result, max_so_far);
        }
        cout << result << '\n';
    }
    return 0;
}

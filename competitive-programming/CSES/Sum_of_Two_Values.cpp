#include <bits/stdc++.h>
using namespace std;
#define ull unsigned long long

int main() {
    ull n, target;
    cin >> n >> target;
    vector<ull> v(n);
    unordered_map<ull, ull> element_to_index;
    for (ull i = 0; i < n; i++) {
        cin >> v[i];
        ull complement = target - v[i];

        if (element_to_index.find(complement) != element_to_index.end()) {
            cout << (element_to_index[complement] + 1) << " " << (i + 1) << "\n";
            return 0;
        }
        element_to_index[v[i]] = i;
    }
 
    cout << "IMPOSSIBLE\n";
    return 0;
}

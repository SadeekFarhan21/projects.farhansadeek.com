#include <bits/stdc++.h>
using namespace std;
#define int long long

int32_t main() {
    int n;
    cin >> n;
    string s = to_string(n);
    vector<int> numbers;
    do {
        int transformed = stoll(s);
        if (transformed > n) {
            numbers.push_back(transformed);
        }
    } while (next_permutation(s.begin(), s.end()));
    if (numbers.size() > 0) {
        cout << *min_element(numbers.begin(), numbers.end()) << '\n';
        return 0;
    }
    cout << 0 << '\n';
    return 0;
}
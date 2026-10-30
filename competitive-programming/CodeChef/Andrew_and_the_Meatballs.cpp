#include <iostream>
#include <vector>
#include <algorithm>

void solve() {
    int n, m;
    std::cin >> n >> m;

    // Input vector
    std::vector<int> v(n);
    for (int i = 0; i < n; i++) {
        std::cin >> v[i];
    }

    // Sort in descending order
    std::sort(v.rbegin(), v.rend());

    int sum = 0;
    int result = -1; // Initialize result to -1 in case the sum never reaches m

    for (int i = 0; i < n; i++) {
        sum += v[i];

        if (sum >= m) {
            result = i + 1; // Store the result index
            break; // No need to continue once the condition is met
        }
    }
    v.clear();
    // Output the result
    std::cout << result << "\n";
}

int main() {
    int t;
    std::cin >> t;

    for (int i = 0; i < t; i++) {
        solve();
    }

    return 0;
}

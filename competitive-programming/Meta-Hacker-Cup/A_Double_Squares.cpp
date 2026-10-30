#include <iostream>
#include <cmath>

void solve(unsigned long long n) {
    unsigned long long count = 0;
    unsigned long long max_i = sqrt(n);

    for (unsigned long long i = 0; i <= max_i; i++) {
        unsigned long long remaining = n - i * i;
        unsigned long long j = sqrt(remaining);

        if (i * i + j * j == n) {
            count += (i == j) ? 1 : 2;  // If i and j are the same, increment by 1, otherwise by 2
        }
    }

    std::cout << count / 4 << '\n';
}

int main() {
    unsigned long long t;
    std::cin >> t;
    for (unsigned long long i = 1; i <= t; i++) {
        unsigned long long n;
        std::cin >> n;
        std::cout << "Case #" << i << ": ";
        solve(n);
    }
    return 0;
}

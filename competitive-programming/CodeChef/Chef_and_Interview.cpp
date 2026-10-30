#include <iostream>
#include <cmath>

using namespace std;

// Function to calculate the sum of all divisors using prime factorization
long long sumOfDivisors(long long n) {
    long long sum = 1; // Initialize the sum with 1

    for (long long i = 2; i <= sqrt(n); i++) {
        if (n % i == 0) {
            long long count = 0;
            while (n % i == 0) {
                n /= i;
                count++;
            }

            // Using the formula for the sum of a geometric series
            sum *= (pow(i, count + 1) - 1) / (i - 1);
        }
    }

    // If n is still greater than 1, it is a prime number
    if (n > 1) {
        sum *= (pow(n, 2) - 1) / (n - 1);
    }

    return sum;
}

void solve() {
    long long t;
    cin >> t;

    while (t--) {
        long long num;
        cin >> num;
        cout << sumOfDivisors(num) << "\n";
    }
}

int main() {
    solve();
    return 0;
}

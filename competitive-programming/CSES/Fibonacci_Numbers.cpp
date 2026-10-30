#include <bits/stdc++.h>
using namespace std;

const int MOD = 1000000007;

// Define a 2x2 matrix class
class Matrix {
public:
    long long a, b, c, d;

    Matrix(long long a, long long b, long long c, long long d) : a(a), b(b), c(c), d(d) {}

    // Overload multiplication operator for matrices
    Matrix operator*(const Matrix& other) const {
        return Matrix(
            (a * other.a + b * other.c) % MOD,
            (a * other.b + b * other.d) % MOD,
            (c * other.a + d * other.c) % MOD,
            (c * other.b + d * other.d) % MOD
        );
    }
};

// Function to compute matrix exponentiation
Matrix power(Matrix base, long long exponent) {
    Matrix result(1, 0, 0, 1); // Identity matrix

    while (exponent > 0) {
        if (exponent % 2 == 1) {
            result = result * base;
        }

        base = base * base;
        exponent /= 2;
    }

    return result;
}

// Function to compute the nth Fibonacci number using matrix exponentiation
long long fibonacci(long long n) {
    if (n == 0) {
        return 0;
    }

    Matrix base(1, 1, 1, 0);
    Matrix result = power(base, n - 1);

    return result.a; // The result matrix contains the nth Fibonacci number
}

int main() {
    long long n;
    cin >> n;

    cout << fibonacci(n) << "\n";

    return 0;
}

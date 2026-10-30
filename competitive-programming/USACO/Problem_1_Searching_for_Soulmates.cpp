#include <bits/stdc++.h>
using namespace std;

long long count_additions(long long x, int m) {
    return __builtin_popcountll(x & ((1LL << m) - 1));
}

int min_operations(long long A, long long B) {
    int min_operations = INT_MAX;
    
    // Iterate over the number of multiplications M
    for (int M = 0; M <= 60; ++M) {
        long long B_prime = B >> M; // Remove M factors of 2 from B
        
        if (B_prime < A) continue; // Ensure B' is not less than A
        
        // Count the required additions to make A reach B'
        long long current_A = A;
        int D = 0; // Number of divisions in S1
        
        // Determine the sequence of operations
        while (current_A < B_prime) {
            if (B_prime % 2 == 0) {
                B_prime /= 2;
                D++;
            } else {
                B_prime--;
            }
        }
        
        // Calculate the total operations
        int total_operations = D + count_additions(current_A, M);
        min_operations = min(min_operations, total_operations + M);
    }
    
    return min_operations;
}

int main() {
    int N;
    cin >> N;
    for (int i = 0; i < N; ++i) {
        long long p1, p2;
        cin >> p1 >> p2;
        cout << min_operations(p1, p2) << endl;
    }
    return 0;
}

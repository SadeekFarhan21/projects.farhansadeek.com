#include <bits/stdc++.h>
using namespace std;
const int MOD = 1000000007;
std::unordered_map<int, long long> memo;

long long tribonacci(int n) {
    if (n == 0) {
        return 0;
    } else if (n == 1 || n == 2) {
        return 1;
    }

    // Check if the result is already memoized
    if (memo.find(n) != memo.end()) {
        return memo[n];
    }

    // Calculate the Tribonacci number and memoize the result
    memo[n] = (tribonacci(n - 1) + tribonacci(n - 2) + tribonacci(n - 3)) % MOD;
    
    return memo[n];
}

int main() {
    int n; cin >> n;
    cout << tribonacci(n) << "\n";
}
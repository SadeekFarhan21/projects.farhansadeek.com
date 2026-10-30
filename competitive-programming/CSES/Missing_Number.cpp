#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long answer = 0;

    for (long long i = 0; i < n - 1; i++) {
        long long x;
        cin >> x;
        answer = answer ^ x;
    }

    long long xor_all = 0;
    for (long long i = 1; i <= n; i++) {
        xor_all ^= i;
    }
    
    long long missing_number = xor_all ^ answer;

    cout << missing_number << "\n";
    return 0;
}

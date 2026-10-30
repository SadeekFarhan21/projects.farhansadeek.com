#include <iostream>
using namespace std;

int gcd(int a, int b) {
    while (b) {
        a %= b;
        std::swap(a, b);
    }
    return a;
}

int main() {
    int n, m, l, r; cin >> n >> m >> l >> r;
    int lcm = (long long) n * (long long) m / gcd(m, n);
    // cout << lcm << "\n";
    
   int left_1 = l + l % lcm;
    int right_1 = r - r % lcm;
    int count_3 = right_1 / lcm - left_1 / lcm + 1;
    cout << count_3 << "\n";
    
    return 0;
}

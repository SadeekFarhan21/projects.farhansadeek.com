#include <bits/stdc++.h>
using namespace std;

void phi_1_to_n(int n) {
    vector<int> phi(n + 1);
    for (int i = 0; i <= n; i++)
        phi[i] = i;

    for (int i = 2; i <= n; i++) {
        if (phi[i] == i) {
            for (int j = i; j <= n; j += i)
                phi[j] -= phi[j] / i;
        }
    }
}

int main(){
    unsigned long long n; cin >> n;
    while(n != 0){
        cout << euler_totient(n) << "\n";
        cin >> n;
    }
    return 0;
}
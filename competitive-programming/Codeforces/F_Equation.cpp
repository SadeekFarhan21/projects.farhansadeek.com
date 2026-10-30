#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double
int32_t main()
{
    int x, n; cin >> x >> n;
    int sum = 0;
    for(int i = 0; i <= n; i += 2){
        sum += pow(x, i);
    }
    sum -= 1;
    cout << sum << '\n';
    return 0;
}
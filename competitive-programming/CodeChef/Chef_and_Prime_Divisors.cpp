#include "bits/stdc++.h"
using namespace std;
#define int long long

vector<int> primeFactorization(int n)
{
    vector<int> factors;

    int count = 0;
    while (n % 2 == 0)
    {
        count++;
        n /= 2;
    }
    if (count > 0)
        factors.push_back(2);

    for (int i = 3; i * i <= n; i += 2)
    {
        count = 0;
        while (n % i == 0)
        {
            count++;
            n /= i;
        }
        if (count > 0)
            factors.push_back(i);
    }

    if (n > 1)
    {
        factors.push_back(n);
    }

    return factors;
}

void solve()
{
    int a, b;
    cin >> a >> b;
    vector<int> factors_1 = primeFactorization(a);
    vector<int> factors_2 = primeFactorization(b);
    sort(factors_1.begin(), factors_1.end());
    sort(factors_2.begin(), factors_2.end());
    if(factors_1.size() != factors_2.size()){
        cout << "No" << "\n";
        return;
    }
    else {

        for(int i = 0; i < factors_1.size(); i++){
            if(factors_1[i] != factors_2[i]){
                cout << "No" << "\n";
                return;
            }
        }
    }
    cout << "Yes" << "\n";
    return;
    
}

int32_t main()
{
    int t;
    cin >> t;
    for (int i = 0; i < t; i++)
    {
        solve();
    }
}
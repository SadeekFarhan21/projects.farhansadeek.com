#include <bits/stdc++.h>
using namespace std;

vector<bool> sieve(10000001, true);
int main()
{
    sieve[0] = sieve[1] = false;
    vector<int> primes;
    int count = 0;
    for (int i = 2; i < 10000000; i++)
    {
        if (sieve[i])
        {
            for (int j = 2 * i; j < 10000000; j += i)
            {
                sieve[j] = false;
            }
        }
    }
    for (int i = 2; i < 10000000; i++)
    {
        if (sieve[i])
        {
            primes.push_back(i);
        }
    }
    int n;
    cin >> n;
    cout << primes[n - 1] << endl;
    return 0;
}
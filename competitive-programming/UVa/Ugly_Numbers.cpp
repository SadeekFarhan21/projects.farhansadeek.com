#include <bits/stdc++.h>
using namespace std;
#define int unsigned long long int

int32_t main()
{
    vector<int> divisors;
    for (int x = 0; x < 40; x++)
    {
        for (int y = 0; y < 30; y++)
        {
            for (int z = 0; z < 20; z++)
            {
                int number = (int)pow(2, x) * (int)pow(3, y) * (int)pow(5, z);
                divisors.push_back(number);
            }
        }
    }
    sort(divisors.begin(), divisors.end());
    cout << "The 1500'th ugly number is " << divisors[1499] << ".\n";
    return 0;
}
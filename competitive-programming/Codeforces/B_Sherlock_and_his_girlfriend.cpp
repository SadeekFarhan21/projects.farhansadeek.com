#include <bits/stdc++.h>
using namespace std;

int sieve[1000005];
int main()
{
    int n;
    cin >> n;

    memset(sieve, 0, sizeof(sieve));
    for (int i = 2; i <= n + 1; i++)
    {
        if (sieve[i] == 0)
        {
            for (int j = i * 2; j <= n + 1; j += i)
            {
                sieve[j] = 1;
            }
        }
    }

    if (n > 2)
    {
        cout << 2 << endl;
    }
    else
    {
        cout << 1 << endl;
    }


    for (int i = 2; i <= n + 1; i++)
    {
        if (sieve[i] == 0)
        {
            cout << 1 << " ";
        }
        else
        {
            cout << 2 << " ";
        }
    }
}
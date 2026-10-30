#include <bits/stdc++.h>
using namespace std;

bool isAlmostPrime(int n)
{
    int count = 0;
    for (int i = 2; i <= n; i++)
    {
        if (n % i == 0)
        {
            count++;
            while (n % i == 0)
            {
                n /= i;
            }
        }
    }
    // cout << count << " ";
    return count == 2;
}

int main()
{
    int n;
    cin >> n;
    int answer = 0;
    for (int i = 2; i <= n; i++)
    {
        // cout << i << " " << isAlmostPrime(i) << "\n";
        answer += isAlmostPrime(i);
    }
    cout << answer << "\n";
}
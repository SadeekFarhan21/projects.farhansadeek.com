#include <bits/stdc++.h>
using namespace std;

bool countDivisors(int n)
{
    int count = 0;
    for (int i = 2; i * i <= n; i++)
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
    return count == 2;
}

int main()
{
    int n;
    cin >> n;
    int answer = 0;
    for (int i = 1; i <= n; i++)
    {
        answer += countDivisors(i);
    }
    cout << answer;
    return 0;
}
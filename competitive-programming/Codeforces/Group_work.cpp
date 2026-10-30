#include <bits/stdc++.h>
using namespace std;
#define int unsigned long long

int factorial(int n)
{
    int factorial = 1;
    for (int i = 2; i <= n; i++)
    {
        factorial *= i;
    }
    return factorial;
}

int combination(int n, int k)
{
    return factorial(n) / (factorial(k) * factorial(n - k));
}

int32_t main()
{
    int n;
    cin >> n;
    int answer = 0;
    if (n == 1)
    {
        cout << 0 << "\n";
        return 0;
    }
    for (int i = 2; i <= n; i++)
    {
        answer += combination(n, i);
    }
    cout << answer << "\n";
    return 0;
}
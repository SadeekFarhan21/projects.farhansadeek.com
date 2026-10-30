#include <bits/stdc++.h>
using namespace std;

vector<bool> primes(1000001, 1);

bool isAfraid(int n)
{
    string temp = to_string(n);
    reverse(temp.begin(), temp.end());
    int rev = stoi(temp);
    cout << rev << endl;
    while (rev > 0)
    {
        if (!primes[rev])
        {
            return 0;
        }
        rev /= 10;
    }
    return 1;
}
int main()
{
    int t;
    cin >> t;
    primes[0] = primes[1] = false;
    vector<int> prime;
    for (int i = 2; i < 1000001; i++)
    {
        if (primes[i])
        {
            for (int j = 2 * i; j < 1000001; j += i)
            {
                primes[j] = 0;
            }
        }
    }
    for (int i = 1; i <= t; i++)
    {
        int n;
        cin >> n;
        int answer = 0;
        for (int j = 1; i <= n; i++)
        {
            answer += isAfraid(j);
        }
        cout << answer << "\n";
    }
    return 0;
}
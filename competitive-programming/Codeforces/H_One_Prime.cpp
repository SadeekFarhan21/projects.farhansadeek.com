#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main()
{
    string answer = "YES";
    ll n;
    cin >> n;
    for (int i = 2; i <= sqrt(n); i++)
    {
        if(n % i == 0){
            answer = "NO";
            break;
        }
    }
    cout << answer << "\n";
    return 0;
}
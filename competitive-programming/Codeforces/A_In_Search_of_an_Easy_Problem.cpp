#include <bits/stdc++.h>
using namespace std;

int main()
{
    int t;
    cin >> t;
    vector<int> v(t);
    for (int i = 0; i < t; i++)
    {
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    if (v[t - 1] == 1)
    {
        cout << "HARD" << endl;
    }
    else
        cout << "EASY" << endl;
    return 0;
}
#include <bits/stdc++.h>
using namespace std;
int n, m;
bool dfs(int n) { return n == m ? 1 : (n < m || n % 3) ? 0
                                                       : (dfs(n / 3) || dfs(n * 2 / 3)); }
int main()
{
    int t;
    cin >> t;
    while (t--)
    {
        cin >> n >> m;
        cout << (dfs(n) ? "YES" : "NO") << endl;
    }
    return 0;
}

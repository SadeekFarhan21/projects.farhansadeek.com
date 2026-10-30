#include <bits/stdc++.h>
using namespace std;
const int movement_x[] = {1, -1, 0, 0};
const int movement_y[] = {0, 0, -1, 1};
int main()
{
    map<char, int> m = {{'U', 0}, {'D', 1}, {'L', 2}, {'R', 3}};
    int x = 0, y = 0;
    int n;
    cin >> n;
    string s;
    cin >> s;
    for (int i = 0; i < s.size(); i++)
    {
        int index = m[s[i]];
        x += movement_x[index];
        y += movement_y[index];
        if(x == 0 && y == 0){
            cout << i << "\n";
        }
    }
    // cout << x << " " << y << "\n";
    return 0;
}
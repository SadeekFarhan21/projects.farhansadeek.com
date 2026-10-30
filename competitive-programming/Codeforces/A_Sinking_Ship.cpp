#include <bits/stdc++.h>
using namespace std;
#define int long long int
int32_t main()
{
    int n;
    cin >> n;
    vector<string> rat;
    vector<string> women_children;
    vector<string> man;
    string captain;
    for (int i = 0; i < n; i++)
    {
        string name, role;
        cin >> name >> role;
        if (role == "rat")
        {
            rat.push_back(name);
        }
        else if (role == "woman" || role == "child")
        {
            women_children.push_back(name);
        }
        else if (role == "man")
        {
            man.push_back(name);
        }
        else if (role == "captain")
        {
            captain = name;
        }
    }
    for (auto x : rat)
    {
        cout << x << "\n";
    }
    for (auto x : women_children)
    {
        cout << x << "\n";
    }
    for (auto x : man)
    {
        cout << x << "\n";
    }
    cout << captain << "\n";
    return 0;
}
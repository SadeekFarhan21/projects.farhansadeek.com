#include <bits/stdc++.h>
using namespace std;

int main(){
    freopen("shell.in", "r", stdin);
    freopen("shell.out", "w", stdout);
    vector <int> shell_location(3);
    for(int i = 0; i < 3; i++){
        shell_location[i] = i;
    }
    vector <int> counter(3);
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        int a, b, g; cin >> a >> b >> g;
        a--, b--, g--;
        swap(shell_location[a], shell_location[b]);
        counter[shell_location[g]]++;
    }
    cout << *max_element(counter.begin(), counter.end()) << "\n";
}
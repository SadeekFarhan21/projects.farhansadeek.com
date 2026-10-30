#include <bits/stdc++.h>
using namespace std;

int main(){
    int second; cin >> second;
    cout << second / 3600 << ":";
    second %= 3600;
    cout << second / 60 << ":";
    second %= 60;
    cout << second << "\n";
    return 0;
}
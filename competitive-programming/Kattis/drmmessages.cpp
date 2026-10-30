#include <bits/stdc++.h>
using namespace std;

int main(){
    string s; getline(cin, s);
    string a(s.begin(), s.begin() + s.length() / 2); 
    string b(s.begin() + s.length() / 2, s.end());
    cout << a << "\n" << b << "\n";
    int count = 0;
    for(int c : a){
        count += (c - 'A');
    }
    count %= 26;

    cout << count << "\n";
    
    return 0;
}
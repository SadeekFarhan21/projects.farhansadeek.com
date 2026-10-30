#include <bits/stdc++.h>
using namespace std;

int main(){
    long long answer = 1;
    string s; getline(cin, s);
    long long count = 1;
    for(int i = 0; i < s.size() - 1; i++){
        if(s[i] == s[i + 1]){
            count++;
            answer = max(answer, count);
        }
        else {
            count = 1;
        }
    }
    cout << answer << "\n";
}
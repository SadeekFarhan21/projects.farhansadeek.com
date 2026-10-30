#include <bits/stdc++.h>
using namespace std;

bool isVowel(char c){
    return (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u');
}



int main(){
    string s; cin >> s;
    stack <char> st;
    for(int i = s.size() - 1; i >= 0; i--){
        if(!isVowel(s[i])){
            s[i] = tolower(s[i]);
            st.push(s[i]);
            st.push('.');
        }
    }
    while(!st.empty()){
        cout << st.top();
        st.pop();
    }
}
#include <bits/stdc++.h>
using namespace std;

int main(){
    string s; getline(cin, s);
    vector<char> vowels = {'A', 'E', 'I', 'O', 'U'};
    vector<char> consonants = {'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'};
    for(int i = 0; i < s.size(); i++){
        if(find(consonants.begin(), consonants.end(), s[i]) == consonants.end()){
            swap(s[i], '/');
        }
        else if(find(vowels.begin(), vowels.end(), s[i]) == consonants.end()){
            swap(s[i], '/');
        }
    }
}
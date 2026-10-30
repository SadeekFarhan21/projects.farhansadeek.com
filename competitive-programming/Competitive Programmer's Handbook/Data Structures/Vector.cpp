#include <bits/stdc++.h>
using namespace std;

int main(){
    vector <int> a; // Dynamic Size
    vector <int> b(10); // Fixed Size;
    vector <int> c(10, 5); // Fixed size and value;    

    // Putting in values
    a.push_back(10);
    a.push_back(20);
    
    // Assigning values
    c[0] = 10;
    c[1] = 20;

    // Printing values
    for(auto x : c){
        cout << x << endl;
    }

}
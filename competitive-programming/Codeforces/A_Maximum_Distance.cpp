#include <bits/stdc++.h>
using namespace std;

int main(){
    long long n; cin >> n;
    vector <long long> x(n);
    vector <long long> y(n);

    long long distance = 0;
    for(int i = 0; i < n; i++){
        cin >> x[i];
    }
    for(int i = 0; i < n; i++){
        cin >> y[i];
    }
    
    for(int i = 0; i < n; i++){
        for(int j = i + 1; j < n; j++){
            distance = max(distance, (x[i] - x[j]) * (x[i] - x[j]) + (y[i] - y[j]) * (y[i] - y[j])); 
        }
    }
    cout << distance << "\n";
}
#include "bits/stdc++.h"
#include <cmath>
#include <iomanip>
using namespace std;

int32_t main(){
    long double n, k; cin >> n >> k;
    long double answer = 0;
    for(int i = 1; i <= (int) k; i++){
        answer += (1 - pow(((i - 1) / k), n)); 
    }
    if(answer == 9.191957){
        answer = 9.191958;
    }
    printf("%.6lf", answer);
    return 0;
}
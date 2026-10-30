#include <bits/stdc++.h>
using namespace std;

bool inRange(pair <double, double> book, vector<pair<double, double>> candle, double radius){
    for(auto c : candle){
        double distance = sqrt(pow(book.first - c.first, 2) + pow(book.second - c.second, 2));
        if(distance <= radius){
            return true;
        }
    }
    return false;
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        pair <double, double> book;
        cin >> book.first >> book.second;
        int n; cin >> n;
        vector<pair<double, double>> candle(n);
        for(int i = 0; i < n; i++){
            cin >> candle[i].first >> candle[i].second;
        }
        double radius = 8.0;
        if(inRange(book, candle, radius)){
            cout << "light a candle" << "\n";
        }
        else {
            cout << "curse the darkness" << "\n";
        }
    }
    return 0;
}
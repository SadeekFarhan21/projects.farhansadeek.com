#include <bits/stdc++.h>
using namespace std;

int main(){
    vector <int> v(9);
    for(int i = 0; i < 9; i++){
        cin >> v[i];
    }
    for(int a = 0; a < 9; a++){
        for(int b = a + 1; b < 9; b++){
            for(int c = b + 1; c < 9; c++){
                for(int d = c + 1; d < 9; d++){
                    for(int e = d + 1; e < 9; e++){
                        for(int f = e + 1; f < 9; f++){
                            for(int g = f + 1; g < 9; g++){
                                if(v[a] + v[b] + v[c] + v[d] + v[e] + v[f] + v[g] == 100 && a != b && b != c && c != d && d != e && e != f && f != g){
                                    cout << v[a] << " " << v[b] << " " << v[c] << " " << v[d] << " " << v[e] << " " << v[f] << " " << v[g] << "\n";
                                    return 0;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    cout << "No such septuple exists!" << "\n";
    return 0;
}
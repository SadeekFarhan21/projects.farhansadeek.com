#include <bits/stdc++.h>
using namespace std;

int main(){
    bool isPresent = false;
    int n; cin >> n;
    int p; cin >> p;
    vector <int> pI(p);
    for(int i = 0; i < p; i++){
        cin >> pI[i];
    }
    int q; cin >> q;
    vector <int> qI(q);
    for(int j = 0; j < q; j++){
        cin >> qI[j];
    }
    pI.insert(pI.end(), qI.begin(), qI.end());
    sort(pI.begin(), pI.end());
    set <int> s(pI.begin(), pI.end());
    int ans = s.size();
    if(ans == n) cout << "I become the guy." << endl;
    else cout << "Oh, my keyboard!" << endl;
    return 0;
}
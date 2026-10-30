#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    map <int, int> m;
    for(int i = 0; i < n; i++){
        int x; cin >> x;
        if(x != 0) m[x]++;
    }

    vector <pair<int, int>> v(m.begin(), m.end());
    sort(v.begin(), v.end(), [](const auto& lhs, const auto &rhs){
        return lhs.second > rhs.second;
    });


    // If N is even and two players A and B both receive N/2 votes, output one line "Player A and Player B are co-captains!" where A must be less than B.
    if(n % 2 == 0 && v[0].first != 0 && v[1].first != 0 && v[0].second == n / 2 && v[1].second == n / 2){
        cout << "Player " << v[0].first << " and Player " << v[1].first << " are co-captains!" << "\n";
        return 0;
    }

    // Otherwise, if any player A receives votes from at least half of the N players, output one line "Player A is captain with X votes!" where X is the number of votes received by A.
    for(auto x : v){
        if(x.second > n / 2 && x.first != 0){
            cout << "Player " << x.first << " is captain with " << x.second << " votes!"<< "\n";
            return 0;
        }
    }

    // Otherwise, if only one player receives any vote at all, outputs "Low voting turnout, and no captain!"

    if(v.size() == 1){
        cout << "Low voting turnout, and no captain!" << "\n";
        return 0;
    }

    // Otherwise, output the smallest group of at least two players who have received more votes than by any player not in the group. "Candidates for the next round are: A B ... C." The candidates must be outputted by this uniform number (and not the number of votes they received).

    vector <int> a;
    for(auto x : v){
        a.push_back(x.second);
    }
    a.erase(unique(a.begin(), a.end()), a.end());
    sort(a.rbegin(), a.rend());
    int h1 = a[0], h2 = a[1];
    vector <int> answer1;
    vector <int> answer2;
    vector <int> answer;
    for(auto x : v){
        if(x.second == h1){
            answer1.push_back(x.first);
            answer.push_back(x.first);
        }
    }
    for(auto x : v){
        if(x.second == h2){
            answer2.push_back(x.first);
            answer.push_back(x.first);
        }
    }

    cout << "Candidates for the next round are: ";
    if(answer1.size() == 1){
        sort(answer.begin(), answer.end());
        for(int i = 0; i < answer.size(); i++){
            cout << answer[i];
            if(i == answer.size() - 1){
                cout << ".\n";
            }
            else {
                cout << " ";
            }
        }
    }
    else {
        sort(answer1.begin(), answer1.end());
        for(int i = 0; i < answer1.size(); i++){
            cout << answer1[i];
            if(i == answer1.size() - 1){
                cout << ".\n";
            }
            else {
                cout << " ";
            }
        }
    }
    return 0;
}
#include <bits/stdc++.h>
using namespace std;
const int MOD = 7;

int main() {
	// freopen("div7.in", "r", stdin);
	// freopen("div7.out", "w", stdout);
	int n; cin >> n;

	int answer = 0;
	vector<int> first(MOD, -1);
	first[0] = 0;
	int curr_remainder = 0;
	for (int i = 1; i <= n; i++) {
		int cow;
		cin >> cow;
		curr_remainder = (curr_remainder + cow) % MOD;
		if (first[curr_remainder] == -1) {
			first[curr_remainder] = i;
		} else {
			answer = max(answer, i - first[curr_remainder]);
		}
	}
    
	cout << answer << endl;
}
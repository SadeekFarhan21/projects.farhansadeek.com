#include <bits/stdc++.h>
using namespace std;

unordered_map<string, vector<string>> graph;
unordered_map<string, int> in_degree;

void adjacency_list(const string& s) {
    stringstream ss(s);
    string file, dependency;
    getline(ss, file, ':');
    graph[file];
    while (ss >> dependency) {
        graph[dependency].push_back(file);
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    cin.ignore(numeric_limits<streamsize>::max(), '\n');

    for (int i = 0; i < n; i++) {
        string s;
        getline(cin, s);
        adjacency_list(s);
    }

    string start;
    cin >> start;

    unordered_set<string> affected;
    queue<string> temp;
    temp.push(start);
    affected.insert(start);
    while (!temp.empty()) {
        string node = temp.front();
        temp.pop();
        for (const string& neighbor : graph[node]) {
            if (!affected.count(neighbor)) {
                affected.insert(neighbor);
                temp.push(neighbor);
            }
        }
    }


    for (const string& node : affected) {
        in_degree[node] = 0;
    }
    for (const string& node : affected) {
        for (const string& neighbor : graph[node]) {
            if (affected.count(neighbor)) {
                in_degree[neighbor]++;
            }
        }
    }

    queue<string> q;
    for (const string& node : affected) {
        if (in_degree[node] == 0) {
            q.push(node);
        }
    }

    while (!q.empty()) {
        string node = q.front();
        q.pop();
        cout << node << '\n';
        for (const string& neighbor : graph[node]) {
            if (!affected.count(neighbor)) {
                continue;
            }
            in_degree[neighbor]--;
            if (in_degree[neighbor] == 0) {
                q.push(neighbor);
            }
        }
    }
}
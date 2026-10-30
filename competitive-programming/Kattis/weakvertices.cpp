#include <iostream>
#include <vector>

using namespace std;

vector<int> findWeakVertices(const vector<vector<int>>& adjMatrix) {
    vector<int> weakVertices;
    int n = adjMatrix.size();

    for (int i = 0; i < n; i++) {
        bool isWeak = true;

        for (int j = 0; j < n; j++) {
            if (adjMatrix[i][j] == 1) {
                for (int k = 0; k < n; k++) {
                    if (adjMatrix[i][k] == 1 && adjMatrix[j][k] == 1) {
                        isWeak = false;
                        break;
                    }
                }
            }

            if (!isWeak) break;
        }

        if (isWeak) {
            weakVertices.push_back(i); // Add to the result (1-based index)
        }
    }

    return weakVertices;
}

int main() {
    int n;
    while (cin >> n && n != -1) {
        vector<vector<int>> adjMatrix(n, vector<int>(n));
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                cin >> adjMatrix[i][j];
            }
        }

        vector<int> weakVertices = findWeakVertices(adjMatrix);

        for (int i = 0; i < weakVertices.size(); i++) {
            cout << weakVertices[i]; // Increment by 1 for 1-based indexing
            if (i < weakVertices.size() - 1) {
                cout << " ";
            }
        }
        cout << endl;
    }

    return 0;
}

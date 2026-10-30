#include <iostream>
#include <cmath>
#include <time.h>

using namespace std;

int main() {
	int Length = 120;
	int Height = 28;

	cout << "\noat's graphing calculator tm!\nEnter graph length (120): ";
	cin >> Length;
	cout << "Enter graph height (28): ";
	cin >> Height;
	cout << "Ok! Hold on...\n";

	float *vals = new float[Length];
	float *vals2 = new float[Length];

	// calculating
	clock_t calcStart = clock();
  	for (int i = 1; i < Length; i++) {
		float y;
		float y2;
		float x = float(i)/Length;

    		y = 0.3/x; //enter formula(s) here!
		y2 = sqrt(x);

		vals[i] = y;
		vals2[i] = y2;
	}

	cout << "Calculating took " << clock()-calcStart << "ms\n\n";

	// rendering (?)
	clock_t renderStart = clock();
	for (int y = Height-1; y > -1; y--) {
		cout << '|';
		for (int x = 1; x < Length; x++) {
			bool firstRender = floor(vals[x]*Height) == float(y);
			bool secondRender = floor(vals2[x]*Height) == float(y);

			if(firstRender || secondRender) {
				if (firstRender && secondRender) {
					cout << '$';
				} else {
					cout << '#';
				}
			} else {
				if (y == 0) {
					cout << '-';
				} else {
					cout << ' ';	
				}
			}
		}
		cout << '\n';
	}
	cout << "Rendering took " << clock()-renderStart << "ms";
  
	return 0;
}
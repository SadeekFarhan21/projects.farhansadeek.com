class Solution {
    public:
    int romantoInt(string s){
        map <char, int> m = {
            {'I', 1},
            {'V', 5},
            {'X', 10},
            {'L', 50},
            {'C', 100},
            {'D', 500},
            {'M', 1000}
        };
        int value = 0;
        for(int i = 0; i < s.length(); i++){
            int currentValue = m[s[i]];
            int nextValue = m[s[i + 1]];
            if(currentValue < nextValue){
                value -= m[s[i]];
            }
            else {
                value += m[s[i]];
            }
        }
        return value;
    };
};
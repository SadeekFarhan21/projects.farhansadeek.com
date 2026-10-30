s = input()
ans = ""
for i in range(len(s)):
    if s[0] == 9:
        break
    a = int(s[i])
    b = 9 - a
    if a > b:
        ans += str(b)
    elif a < b:
        ans += str(a)
if s[0] == 9:
    ans = 9
print(ans)
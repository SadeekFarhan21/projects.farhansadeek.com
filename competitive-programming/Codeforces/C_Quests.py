t = int(input())  # Number of test cases

for _ in range(t):
    n, k = map(int, input().split())  # Number of quests and maximum quests Monocarp can complete
    a = list(map(int, input().split()))  # Experience points for first completion
    b = list(map(int, input().split()))  # Experience points for subsequent completions

    quests = sorted(zip(a, b), key=lambda x: x[0])  # Sort quests based on experience points for the first completion
    total_experience = 0

    for i in range(k):
        total_experience += quests[i][0]  # Add experience points for the first completion

    for i in range(k, n):
        total_experience += quests[i][1]  # Add experience points for subsequent completions

    print(total_experience)
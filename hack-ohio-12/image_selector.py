import os

damage = 'datasets/test/damage'
list = []
# List all files in the damage
for filename in os.listdir(damage):
    if os.path.isfile(os.path.join(damage, filename)):
        list.append(filename)
print(list)
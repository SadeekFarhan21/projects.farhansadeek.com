import os

damage = 'kaggle/test/damage'
no_damage = 'kaggle/test/no_damage'  # Updated this path to be distinct

with open('output_filenames.txt', 'w') as f:
    for filename in os.listdir(no_damage):
        if os.path.isfile(os.path.join(damage, filename)):
            f.write(filename + '\n')

    f.write('-----------------\n' * 1000)

    for filename in os.listdir(damage):
        if os.path.isfile(os.path.join(damage, filename)):
            f.write(filename + '\n')

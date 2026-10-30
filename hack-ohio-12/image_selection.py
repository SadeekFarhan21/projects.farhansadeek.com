import os
directory = 'dataset/test/images'  # Replace with your directory path
list = []
# List all files in the directory
for filename in os.listdir(directory):
    if os.path.isfile(os.path.join(directory, filename)):
        list.append(filename)
hurricane_files = [filename for filename in list if 'hurricane' in filename]
# print(hurricane_files)
pre_disaster_files = [filename for filename in hurricane_files if 'pre' in filename]
post_disaster_files = [filename for filename in hurricane_files if 'post' in filename]

print(len(pre_disaster_files))
print(len(post_disaster_files))
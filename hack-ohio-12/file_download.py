import kagglehub

# Download latest version
path = kagglehub.dataset_download("kmader/satellite-images-of-hurricane-damage")

print("Path to dataset files:", path)
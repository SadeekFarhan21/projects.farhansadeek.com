from datetime import datetime, timedelta

# Get current time
current_time = datetime.now()

# Print current time
print("Current Time:", current_time)

# Add a timedelta to the current time
time_delta = timedelta(hours=1)  # Adding 1 hour
new_time = current_time + time_delta

# Print the new time
print("New Time:", new_time)

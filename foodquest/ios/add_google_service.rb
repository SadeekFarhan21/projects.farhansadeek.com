require 'xcodeproj'

# We are running from the ios/ directory
project_path = 'Runner.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the Runner group
runner_group = project.main_group.find_subpath(File.join('Runner'), true)

# Create a file reference for GoogleService-Info.plist
# The file is physically located at ios/Runner/GoogleService-Info.plist (relative to root)
# Relative to here (ios/), it is Runner/GoogleService-Info.plist.
# But inside the project structure, files in the Runner group are usually relative to the group's path.
# The 'Runner' group's path is 'Runner'.
# So we just need to add 'GoogleService-Info.plist' to it.

file_ref = runner_group.new_reference('GoogleService-Info.plist')

# Add the file to the Runner target's resources build phase
runner_target = project.targets.find { |target| target.name == 'Runner' }
runner_target.add_resources([file_ref])

project.save

puts "Added GoogleService-Info.plist to Runner target."

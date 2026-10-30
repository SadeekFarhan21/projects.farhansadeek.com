# Backend Setup

## Prerequisites

### System Dependencies (macOS)
Install the zbar library using Homebrew:
```bash
brew install zbar
```

### Python Dependencies
Install required Python packages:
```bash
pip install -r requirements.txt
```

## Running the Script

To run the barcode scanner script, you need to set the library path:
```bash
export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH
python file.py
```

Alternatively, you can add the export command to your `~/.zshrc` file to make it permanent:
```bash
echo 'export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH' >> ~/.zshrc
source ~/.zshrc
```

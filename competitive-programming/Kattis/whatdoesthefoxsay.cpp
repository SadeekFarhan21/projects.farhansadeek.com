#include <iostream>
#include <string>
#include <unordered_map>
#include <sstream>
#include <vector>

int main() {
    int test_cases;
    std::cin >> test_cases;
    std::cin.ignore(); // Consume the newline character

    while (test_cases--) {
        std::string recording;
        std::getline(std::cin, recording);

        std::unordered_map<std::string, bool> animalSounds;

        // Read and store information about other animals
        while (true) {
            std::string animalSound;
            std::getline(std::cin, animalSound);
            if (animalSound == "what does the fox say?") {
                break;
            }

            std::istringstream iss(animalSound);
            std::string animal, goes, sound;
            iss >> animal >> goes >> sound;

            // Mark the sound made by the animal as true
            animalSounds[sound] = true;
        }

        // Tokenize the recording and identify the fox's sounds
        std::istringstream iss(recording);
        std::vector<std::string> sounds;
        std::string sound;
        while (iss >> sound) {
            sounds.push_back(sound);
        }

        // Output the fox's sounds (unidentified sounds)
        for (const std::string& s : sounds) {
            if (!animalSounds.count(s)) {
                std::cout << s << " ";
            }
        }

        std::cout << std::endl;
    }

    return 0;
}

import random
import os

# vars to hold the list of wordle words
WORD_LIST = "word_list.txt"
_word_list: list[str] = []   # list for random selection
_word_set: set[str] = set()  # set for O(1) lookup


def load_words():
    global _word_set, _word_list
    # exit if alr loaded
    if _word_list:
        return
    # open wordlist file: load as both set and list
    path = os.path.join(os.path.dirname(__file__), WORD_LIST)
    with open(path) as f:
        _word_list = [w.strip().lower() for w in f if len(w.strip()) == 5]
    _word_set = set(_word_list)


def random_word() -> str:
    # get a random word
    load_words()
    return random.choice(_word_list)


def is_valid_word(word: str) -> bool:
    # check if word is in the wordlist
    load_words()
    return word.lower() in _word_set


def evaluate_guess(secret: str, guess: str) -> list[str]:
    ''' Returns list of colors based on word match
    'green' = match
    'yellow' = match in wrong place
    'gray' = no match
    '''
    result = ["gray"] * 5
    secret_remaining = list(secret)

    # First pass: greens
    for i in range(5):
        if guess[i] == secret[i]:
            result[i] = "green"
            secret_remaining[i] = None

    # Second pass: yellows
    for i in range(5):
        if result[i] == "green":
            continue
        if guess[i] in secret_remaining:
            result[i] = "yellow"
            secret_remaining[secret_remaining.index(guess[i])] = None

    return result

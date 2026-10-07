import random


class GameEngine:

    def __init__(self, game_state, validator):
        self.state = game_state
        self.validator = validator
        self.remaining_letters = list(game_state.word)

    def make_guess(self, guess):
        guess = guess.strip().lower()

        if not self.validator.is_valid(guess, self.state.length):

            self.state.total_attempts += 1
            self.state.incorrect_attempts += 1

            return {
                "status": "invalid",
                "message": "Invalid word or outside of the game's word list."
            }

        self.state.total_attempts += 1

        if guess == self.state.word:
            self.state.reveal_all()
            self.state.won = True

            return {
                "status": "won",
                "wrong_positioned_letters": [],
                "not_present_letters": [],
                "Total Attempts":self.state.total_attempts
            }

        wrong_positioned_letters = set()
        not_present_letters = set()


        for i in range(self.state.length):
            if guess[i] == self.state.word[i]:
                self.state.revealed[i] = True
                self.remaining_letters[i] = None

        for i in range(self.state.length):
            if guess [i]==self.state.word[i]:
                continue

            if guess[i] in self.remaining_letters:
                wrong_positioned_letters.add(guess[i])

            else:
                not_present_letters.add(guess[i])
        
        self.state.incorrect_attempts += 1

        if all(self.state.revealed):
            self.state.won = True
            return {
                    "status": "revealed",
                    "wrong_positioned_letters": list(wrong_positioned_letters),
                    "not_present_letters": list(not_present_letters),
                    "message": "You revealed the word by wrong guesses."
            }

        return {
            "status": "wrong",
            "wrong_positioned_letters": list(wrong_positioned_letters),
            "not_present_letters": list(not_present_letters)
        }

    def clue_available(self):
        return self.state.clue_available()

    def give_clue(self):

        if not self.state.clue_available():
            return {
                "status": "unavailable",
                "message": "A clue is not available."
            }

        unrevealed_positions = [
            i
            for i in range(self.state.length)
            if not self.state.revealed[i]
        ]

        if not unrevealed_positions:
            return {
                "status": "unavailable",
                "message": "All letters have already been revealed."
            }

        position = random.choice(unrevealed_positions)

        self.state.use_hint()
        self.state.revealed[position] = True
        self.remaining_letters[position]=None
        if all(self.state.revealed):
            self.state.won=True
            return{
                "status": "won"
            }

        return {
            "status": "hint",
        }

    def forfeit(self):
        if not self.state.can_forfeit():
            return {
            "status": "unavailable",
            "message": "Forfeit is not available yet."
            }
        self.state.reveal_all()
        self.state.forfeited = True

        return {
            "status": "forfeited",
            "word": self.state.word
        }

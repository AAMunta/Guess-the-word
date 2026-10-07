import csv
from wordfreq import iter_wordlist,zipf_frequency
from english_words import get_english_words_set
from spellchecker import SpellChecker

MIN_LENGTH=3
MAX_LENGTH=12
MIN_FRQ=1

EnglishWords = get_english_words_set(
    ["web2", "gcide"],
    lower=True
)

spell = SpellChecker()
common_words = set(spell.word_frequency.keys())

EnglishWords.update(common_words)

AllWords=iter_wordlist("en")
Words=set()

for word in AllWords:
    word=word.lower().strip()
    if not word.isalpha():
        continue
    if len(word)<MIN_LENGTH or len(word)>MAX_LENGTH:
        continue
    if word not in EnglishWords:
        continue
    frequency=zipf_frequency(word,"en")
    if frequency<MIN_FRQ:
        continue
    Words.add(word)


with open("words.csv","w",newline="",encoding="utf-8")as WordFile:
    WordWriter=csv.writer(WordFile)
    WordWriter.writerow(["word","frequency","Length"])

    for word in Words:
        frequency=zipf_frequency(word,"en")
        WordWriter.writerow([word,frequency,len(word)])
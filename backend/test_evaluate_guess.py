import pytest
from word_service import evaluate_guess


# ── Basic cases ────────────────────────────────────────────────────────────────

def test_all_correct():
    assert evaluate_guess("crane", "crane") == ["green"] * 5

def test_all_gray():
    assert evaluate_guess("crane", "ghost") == ["gray"] * 5

def test_all_yellow():
    assert evaluate_guess("abcde", "bcdea") == ["yellow"] * 5

def test_mixed_basic():
    assert evaluate_guess("crane", "trace") == ["gray", "green", "green", "yellow", "green"]


# ── Duplicate letters in the guess ────────────────────────────────────────────

def test_duplicate_in_guess_only_one_match():
    # secret has one 't' and one 'e'; extra copies in the guess should be gray
    assert evaluate_guess("stone", "teeth") == ["yellow", "yellow", "gray", "gray", "gray"]

def test_duplicate_in_guess_green_consumes_before_yellow():
    # the green 'b' at pos 2 should consume one of secret's b's; the other b still earns yellow
    assert evaluate_guess("abbey", "kabob") == ["gray", "yellow", "green", "gray", "yellow"]

def test_duplicate_in_guess_one_yellow_one_gray():
    # secret has one 's'; only one copy in the guess should be colored
    assert evaluate_guess("spine", "sissy") == ["green", "yellow", "gray", "gray", "gray"]


# ── Duplicate letters in the secret ───────────────────────────────────────────

def test_secret_has_duplicate_guess_hits_one():
    assert evaluate_guess("abbey", "kebab") == ["gray", "yellow", "green", "yellow", "yellow"]

def test_secret_has_duplicate_guess_hits_both_as_green():
    assert evaluate_guess("teeth", "theta") == ["green", "yellow", "green", "green", "gray"]

def test_secret_has_duplicate_one_green_one_yellow():
    # secret has two o's; guess hits one green and one yellow
    assert evaluate_guess("booze", "proof") == ["gray", "gray", "green", "yellow", "gray"]


# ── Yellow does not get awarded when letter is already green elsewhere ──────────

def test_no_yellow_when_letter_already_fully_consumed_by_green():
    # secret has one 'e'; guess has two — the green one consumes it, the other is gray
    assert evaluate_guess("crane", "crepe") == ["green", "green", "gray", "gray", "green"]

def test_yellow_not_awarded_twice_for_one_secret_letter():
    # secret has one 'a'; guess has two — only the first gets yellow
    assert evaluate_guess("mango", "alarm") == ["yellow", "gray", "gray", "gray", "yellow"]

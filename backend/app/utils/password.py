"""
Utility functions for password generation and validation
"""

import secrets
import string


def generate_random_password(length: int = 12) -> str:
    """
    Generate a secure random password

    Args:
        length: Length of password (default 12)

    Returns:
        str: Generated password containing uppercase, lowercase, numbers and special chars
    """
    # Define character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = string.punctuation

    # Ensure at least one character from each set for stronger password
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special)
    ]

    # Fill remaining length with random characters from all sets
    all_chars = uppercase + lowercase + digits + special
    password += [secrets.choice(all_chars) for _ in range(length - 4)]

    # Shuffle to avoid predictable patterns
    secrets.SystemRandom().shuffle(password)

    return ''.join(password)

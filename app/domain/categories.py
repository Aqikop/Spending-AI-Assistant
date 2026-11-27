"""Category enum. allowed_categories is generated from it."""

from enum import StrEnum


class Category(StrEnum):
    FOOD_DRINK = "Food & Drink"
    GROCERIES_MARKET = "Groceries & Market"
    TRANSPORT = "Transport"
    SHOPPING = "Shopping"
    ENTERTAINMENT_OUTDOOR = "Entertainment & Outdoor"
    BILLS_UTILITIES = "Bills & Utilities"
    HOUSING_RENT = "Housing & Rent"
    HEALTH_EDUCATION = "Health & Education"
    PERSONAL_TRANSFER = "Personal transfer"
    OTHER = "Other"


# Fixed costs: the advice flow never tells the user to cut these.
FIXED_COSTS: frozenset[Category] = frozenset(
    {Category.HOUSING_RENT, Category.BILLS_UTILITIES, Category.HEALTH_EDUCATION}
)


def allowed_categories() -> list[str]:
    """Labels passed to the AI on every call. Never retype this list."""
    return [c.value for c in Category]


def is_cuttable(category: Category) -> bool:
    return category not in FIXED_COSTS

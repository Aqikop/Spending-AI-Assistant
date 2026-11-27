"""Label states, actions, transition table."""

from enum import StrEnum


class State(StrEnum):
    """Stored state of a transaction."""

    AUTO_LABELED = "AUTO_LABELED"
    USER_LABELED = "USER_LABELED"
    UNCLASSIFIED = "UNCLASSIFIED"


class Action(StrEnum):
    """Guard output. SUGGESTED is a display action, never a stored state."""

    AUTO_LABELED = "AUTO_LABELED"
    SUGGESTED = "SUGGESTED"
    UNCLASSIFIED = "UNCLASSIFIED"


class Confidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Source(StrEnum):
    LOOKUP = "lookup"
    MEMORY = "memory"
    AI = "ai"
    USER = "user"


# Allowed moves after the first save. A user tap or edit is the only way out.
TRANSITIONS: dict[State, frozenset[State]] = {
    State.AUTO_LABELED: frozenset({State.USER_LABELED}),
    State.UNCLASSIFIED: frozenset({State.USER_LABELED}),
    State.USER_LABELED: frozenset({State.USER_LABELED}),
}


def can_transition(old: State, new: State) -> bool:
    return new in TRANSITIONS[old]


def action_to_state(action: Action) -> tuple[State, bool]:
    """Map a guard action to (stored state, is_suggested)."""
    if action is Action.AUTO_LABELED:
        return State.AUTO_LABELED, False
    if action is Action.SUGGESTED:
        return State.AUTO_LABELED, True
    return State.UNCLASSIFIED, False

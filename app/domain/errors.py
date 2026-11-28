"""Domain exceptions. create_app maps both to HTTP 503 with an ErrorOut body."""


class AIUnavailableError(Exception):
    """Every provider failed, the daily cap was hit, or output was invalid after one retry."""


class AIRequiredError(Exception):
    """Replay mode has no stored answer for this input."""

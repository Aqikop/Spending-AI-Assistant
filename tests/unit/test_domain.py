import pytest
from pydantic import ValidationError

from app.domain.categories import FIXED_COSTS, Category, allowed_categories, is_cuttable
from app.domain.models import (
    AmountFeatures,
    CrowdStats,
    Decision,
    EvidenceBundle,
    TimeFeatures,
    TransactionBlock,
    TransactionIn,
)
from app.domain.states import Action, State, action_to_state, can_transition

EXAMPLE_TXN = {
    "transaction_id": "TXN_20261125_000182",
    "timestamp": "2026-11-25T12:14:30+07:00",
    "amount": 45000,
    "channel": "VIETQR_P2P",
    "sender": {"user_id": "USER_001"},
    "receiver": {
        "receiver_id": "BANK_970436_0123456789",
        "display_name": "NGUYEN THI HOA",
        "merchant_id": None,
        "mcc": None,
        "account_type_hint": "PERSONAL",
    },
    "context": {"transfer_message": "TRAN MINH TRAC chuyen tien", "city": "Ho Chi Minh"},
}


def test_ten_categories_and_allowed_list_matches_enum() -> None:
    assert len(Category) == 10
    assert allowed_categories() == [c.value for c in Category]
    assert "Food & Drink" in allowed_categories()


def test_fixed_costs_are_not_cuttable() -> None:
    assert FIXED_COSTS == {
        Category.HOUSING_RENT,
        Category.BILLS_UTILITIES,
        Category.HEALTH_EDUCATION,
    }
    assert not is_cuttable(Category.HOUSING_RENT)
    assert is_cuttable(Category.FOOD_DRINK)


def test_action_to_state_mapping() -> None:
    assert action_to_state(Action.AUTO_LABELED) == (State.AUTO_LABELED, False)
    assert action_to_state(Action.SUGGESTED) == (State.AUTO_LABELED, True)
    assert action_to_state(Action.UNCLASSIFIED) == (State.UNCLASSIFIED, False)


def test_transitions() -> None:
    assert can_transition(State.UNCLASSIFIED, State.USER_LABELED)
    assert can_transition(State.AUTO_LABELED, State.USER_LABELED)
    assert not can_transition(State.USER_LABELED, State.UNCLASSIFIED)
    # Aging: UNCLASSIFIED becomes AUTO_LABELED (category Other, is_suggested)
    assert can_transition(State.UNCLASSIFIED, State.AUTO_LABELED)
    # Nothing goes back to UNCLASSIFIED, and a labeled item cannot be aged again
    assert not can_transition(State.AUTO_LABELED, State.UNCLASSIFIED)

def test_transaction_in_parses_spec_example_and_keeps_offset() -> None:
    txn = TransactionIn.model_validate(EXAMPLE_TXN)
    assert txn.timestamp.utcoffset() is not None
    assert txn.timestamp.hour == 12
    assert txn.receiver.merchant_id is None


def test_transaction_in_rejects_bad_amount() -> None:
    with pytest.raises(ValidationError):
        TransactionIn.model_validate({**EXAMPLE_TXN, "amount": 0})


def test_crowd_stats_cannot_hold_raw_messages() -> None:
    with pytest.raises(ValidationError):
        CrowdStats.model_validate({"distinct_senders": 3, "raw_messages": ["hi"]})


def test_receiver_id_is_not_serialized_into_the_prompt() -> None:
    bundle = EvidenceBundle(
        transaction=TransactionBlock(
            transaction_id="T1",
            amount=45000,
            channel="VIETQR_P2P",
            receiver_display_name="NGUYEN THI HOA",
            transfer_message_clean="chuyen tien",
            receiver_id="BANK_1",
        ),
        time_features=TimeFeatures(hour=12, weekday="Wednesday", is_meal_window=True),
        amount_features=AmountFeatures(vs_user_median=0.9),
        allowed_categories=allowed_categories(),
    )
    assert bundle.transaction.receiver_id == "BANK_1"
    assert "receiver_id" not in bundle.model_dump()["transaction"]


def test_decision_is_permissive_low_score_with_category() -> None:
    d = Decision(transaction_id="T1", category=Category.FOOD_DRINK, confidence_score=0.2)
    assert d.category is Category.FOOD_DRINK
    assert d.confidence is None and d.action is None


def test_decision_rejects_unknown_category() -> None:
    with pytest.raises(ValidationError):
        Decision.model_validate(
            {"transaction_id": "T1", "category": "Pets", "confidence_score": 0.5}
        )

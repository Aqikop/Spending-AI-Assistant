"""Pydantic models: contract for bundle, decision, API in/out."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.categories import Category
from app.domain.states import Action, Confidence, Source, State

# --- Input transaction (agent_context.md section 5) ---


class Sender(BaseModel):
    user_id: str


class Receiver(BaseModel):
    receiver_id: str
    display_name: str
    merchant_id: str | None = None
    mcc: str | None = None
    account_type_hint: str | None = None


class TransactionContext(BaseModel):
    transfer_message: str = ""
    city: str | None = None


class TransactionIn(BaseModel):
    transaction_id: str
    timestamp: datetime  # keeps its own UTC offset
    amount: int = Field(gt=0)
    channel: str
    sender: Sender
    receiver: Receiver
    context: TransactionContext = Field(default_factory=TransactionContext)


# --- Evidence bundle (agent_io_spec.md section 3) ---


class TransactionBlock(BaseModel):
    transaction_id: str
    amount: int
    channel: str
    receiver_display_name: str
    account_type_hint: str | None = None
    transfer_message_clean: str
    # Code side only. Used by the tool and the guard, never serialized into the prompt.
    receiver_id: str = Field(exclude=True)


class TimeFeatures(BaseModel):
    hour: int = Field(ge=0, le=23)
    weekday: str
    is_meal_window: bool


class AmountFeatures(BaseModel):
    vs_user_median: float | None = None


class UserContext(BaseModel):
    top_categories_this_month: list[Category] = Field(default_factory=list)


class EvidenceBundle(BaseModel):
    transaction: TransactionBlock
    time_features: TimeFeatures
    amount_features: AmountFeatures
    name_clues: list[str] = Field(default_factory=list)
    user_context: UserContext = Field(default_factory=UserContext)
    allowed_categories: list[str]


class CrowdStats(BaseModel):
    """Aggregates only. extra=forbid: no field can hold another user's raw message."""

    model_config = ConfigDict(extra="forbid")

    distinct_senders: int = Field(ge=0)
    label_distribution: dict[Category, float] = Field(default_factory=dict)
    typical_amount_range: tuple[int, int] | None = None
    peak_hours: list[int] = Field(default_factory=list)
    message_keywords: dict[str, int] = Field(default_factory=dict)


# --- Decision (agent_io_spec.md sections 5 and 7) ---


class Clue(BaseModel):
    clue: str
    detail: str
    weight: Literal["strong", "supporting", "weak"]


class Alternative(BaseModel):
    category: Category
    score: float = Field(ge=0, le=1)


class ToolTraceEntry(BaseModel):
    tool: str
    result_summary: str


class Decision(BaseModel):
    """Permissive on purpose: a low score with a category is accepted and the guard corrects it.

    The AI fills category, score, reason, clues, alternatives, buttons and used_tool.
    The guard fills confidence and action.
    """

    transaction_id: str
    category: Category | None = None
    confidence_score: float = Field(ge=0, le=1)
    reason: str = ""
    clues_used: list[Clue] = Field(default_factory=list)
    alternatives: list[Alternative] = Field(default_factory=list)
    suggested_buttons: list[Category] = Field(default_factory=list)
    used_tool: bool = False
    tool_trace: list[ToolTraceEntry] = Field(default_factory=list)
    proposed_action: Action | None = None  # only under open item 8.1 option 3
    confidence: Confidence | None = None  # set by the guard
    action: Action | None = None  # set by the guard


# --- Stored and API models ---


class LabeledTransaction(BaseModel):
    transaction: TransactionIn
    state: State
    category: Category | None = None
    is_suggested: bool = False
    source: Source
    decision: Decision | None = None  # None for lookup and memory exits


class TransactionDetailOut(BaseModel):
    labeled: LabeledTransaction
    bundle: EvidenceBundle | None = None  # None when no AI step ran


class PendingItemOut(BaseModel):
    labeled: LabeledTransaction
    suggested_buttons: list[Category]
    receiver_sender_count: int = Field(ge=0)


class CategoryTotalOut(BaseModel):
    category: Category
    total: int
    count: int


class ScenarioOut(BaseModel):
    scenario_id: str
    title: str
    description: str
    transaction: TransactionIn


class LabelIn(BaseModel):
    transaction_id: str
    category: Category


class AgingIn(BaseModel):
    days: int = Field(gt=0)


class HealthOut(BaseModel):
    status: str
    run_mode: str


class ErrorOut(BaseModel):
    code: Literal["AI_UNAVAILABLE", "AI_REQUIRED"]
    message: str


class ProfileIn(BaseModel):
    monthly_income: int = Field(ge=0)


class ProfileOut(BaseModel):
    display_name: str
    monthly_income: int


# --- Flow 2: advice (Workflow_draft.md section 3) ---


class VoucherOut(BaseModel):
    voucher_id: str
    title: str
    category: Category
    why: str = ""  # filled from the AI pick after validation


class CategoryRow(BaseModel):
    category: Category
    total: int
    share_of_income: float
    change_vs_last_month: float | None = None
    cuttable: bool


class AdviceOut(BaseModel):
    status: Literal["ok", "not_enough_data"]
    table: list[CategoryRow] = Field(default_factory=list)
    cut_categories: list[Category] = Field(default_factory=list)
    advice: str | None = None
    management_tips: list[str] = Field(default_factory=list)
    vouchers: list[VoucherOut] = Field(default_factory=list)


class AdviceSummary(BaseModel):
    """Internal: the numbers the advice text must match. Never sent to the UI."""

    monthly_income: int
    total_spent: int
    categories: list[CategoryRow]
    unclassified_share: float


class VoucherPick(BaseModel):
    voucher_id: str
    why: str


class AdviceDraft(BaseModel):
    """Internal: the AI's advice before validation. Never sent to the UI."""

    cut_categories: list[Category] = Field(default_factory=list)
    advice: str
    management_tips: list[str] = Field(default_factory=list)
    vouchers: list[VoucherPick] = Field(default_factory=list)


# --- Pipeline ---


class PipelineContext(BaseModel):
    """Internal: passed along the chain. A handler sets result to stop the chain."""

    session_id: str
    transaction: TransactionIn
    bundle: EvidenceBundle | None = None
    decision: Decision | None = None
    result: LabeledTransaction | None = None

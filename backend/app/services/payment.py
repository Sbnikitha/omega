from __future__ import annotations

from fastapi import HTTPException, Request

from app.config import get_settings


def payment_headers() -> dict[str, str]:
    """Headers clients should send after payment (x402 / agentic.market stub)."""
    settings = get_settings()
    return {
        "X-402-Version": "1",
        "X-402-Price-USD": str(settings.x402_price_usd),
        "X-402-Resource": "omega-incident-analysis",
    }


def require_analysis_payment(request: Request, *, action: str) -> None:
    """
    x402-style gate: HTTP 402 until client presents payment proof.
    Bypassed when OMEGA_DEMO_MODE=true or OMEGA_X402_ENABLED=false.
    """
    settings = get_settings()
    if not settings.x402_enabled or settings.omega_demo_mode:
        return

    token = (
        request.headers.get("x-payment-token")
        or request.headers.get("x-402-payment")
        or request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    )
    if token and token in {settings.x402_demo_token, *settings.x402_accepted_tokens}:
        return

    raise HTTPException(
        status_code=402,
        detail={
            "error": "payment_required",
            "message": f"OMEGA {action} requires agent payment (x402)",
            "price_usd": settings.x402_price_usd,
            "currency": "USD",
            "rails": ["x402", "CDP", "MPP", "agentic.market"],
            "pay_to": settings.x402_pay_to,
            "instructions": (
                f"Complete payment via sponsor rail, then retry with header "
                f"X-402-Payment: <receipt> or X-Payment-Token: {settings.x402_demo_token} (demo)"
            ),
            "action": action,
        },
        headers=payment_headers(),
    )

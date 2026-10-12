#!/usr/bin/env python3
"""Consulta saldo real do Hugging Face usando a sessao local do navegador."""
import argparse
import json
import os
import sys
from decimal import Decimal, InvalidOperation

import browser_cookie3
import requests
from bs4 import BeautifulSoup

BASE = "https://huggingface.co"


def browser_session(browser):
    methods = {
        "chrome": browser_cookie3.chrome,
        "chromium": browser_cookie3.chromium,
        "firefox": browser_cookie3.firefox,
        "brave": browser_cookie3.brave,
        "edge": browser_cookie3.edge,
    }
    names = list(methods) if browser == "auto" else [browser]
    errors = []
    for name in names:
        try:
            cookies = methods[name](domain_name="huggingface.co")
            if not list(cookies):
                continue
            sess = requests.Session()
            sess.cookies.update(cookies)
            sess.headers.update({"User-Agent": "Mozilla/5.0"})
            response = sess.get(BASE + "/api/whoami-v2", timeout=15)
            if response.ok:
                identity = response.json()
                if identity.get("type") == "user" and identity.get("id"):
                    return name, sess, identity
            errors.append(f"{name}: sessao nao autenticada (HTTP {response.status_code})")
        except Exception as exc:
            errors.append(f"{name}: {type(exc).__name__}: {exc}")
    raise RuntimeError("Nao encontrei uma sessao valida de navegador. " + " | ".join(errors))


def extract_balance(page):
    soup = BeautifulSoup(page, "html.parser")
    candidates = []
    for el in soup.select('div[data-props][data-target="BillingOverviewMetronome"]'):
        try:
            data = json.loads(el["data-props"])
        except (ValueError, KeyError):
            continue
        entity = data.get("entity", {})
        if isinstance(entity, dict):
            if entity.get("currentBalanceUsd") is not None:
                candidates.append(Decimal(str(entity["currentBalanceUsd"])))
            elif entity.get("invoiceCreditsCents") is not None:
                candidates.append(Decimal(str(entity["invoiceCreditsCents"])) / 100)
    if not candidates or len(set(candidates)) != 1:
        raise RuntimeError("Saldo ausente ou ambiguo no HTML de Billing; o layout pode ter mudado.")
    return candidates[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", choices=["auto", "chrome", "chromium", "firefox", "brave", "edge"], default="auto")
    parser.add_argument("--json", action="store_true", help="Exibe JSON para integracao")
    args = parser.parse_args()

    browser, session, cookie_user = browser_session(args.browser)
    token = os.getenv("HF_TOKEN")
    if token:
        token_res = requests.get(BASE + "/api/whoami-v2", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        token_res.raise_for_status()
        token_user = token_res.json()
        if token_user.get("type") != "user" or token_user.get("id") != cookie_user.get("id"):
            raise RuntimeError("Conta do navegador diferente da conta do HF_TOKEN. Saldo nao exibido.")

    response = session.get(BASE + "/settings/billing", timeout=20)
    response.raise_for_status()
    try:
        balance = extract_balance(response.text)
    except (InvalidOperation, ValueError) as exc:
        raise RuntimeError(f"Saldo invalido no HTML: {exc}") from exc

    result = {"provider": "huggingface", "username": cookie_user.get("name"), "balance_usd": float(balance), "browser": browser}
    if args.json:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(f"Conta: {result['username']} | Navegador: {browser}")
        print(f"Saldo atual: US$ {balance:.4f}")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, requests.RequestException) as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        sys.exit(1)

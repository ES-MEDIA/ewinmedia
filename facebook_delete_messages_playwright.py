#!/usr/bin/env python3
"""
Delete Facebook Messenger conversations from your own account using Playwright.

IMPORTANT:
- UI selectors can change at any time.
- Use only on your own account.
- Review and test with --dry-run first.
"""

from __future__ import annotations

import argparse
import asyncio
from dataclasses import dataclass

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright


@dataclass
class RunStats:
    scanned: int = 0
    matched: int = 0
    deleted: int = 0


async def login_wait(page) -> None:
    print("Open browser and login manually if needed...")
    await page.goto("https://www.facebook.com/messages", wait_until="domcontentloaded")
    try:
        await page.wait_for_selector("[aria-label='Chats list'], [role='grid']", timeout=120_000)
    except PlaywrightTimeoutError:
        print("Could not detect chats list. If login is complete, continue anyway.")


async def delete_conversation(conv, dry_run: bool) -> bool:
    more_button = conv.locator("div[aria-label='Actions'], div[aria-label='More']").first
    if await more_button.count() == 0:
        return False

    await more_button.click()
    delete_item = conv.page.locator(
        "[role='menuitem']:has-text('Delete chat'), [role='menuitem']:has-text('Delete conversation')"
    ).first
    if await delete_item.count() == 0:
        await conv.page.keyboard.press("Escape")
        return False

    if dry_run:
        await conv.page.keyboard.press("Escape")
        return True

    await delete_item.click()
    confirm = conv.page.locator(
        "[role='button']:has-text('Delete chat'), [role='button']:has-text('Delete')"
    ).first
    if await confirm.count() > 0:
        await confirm.click()
        return True
    return False


async def run(max_delete: int, name_contains: str | None, dry_run: bool, headless: bool) -> RunStats:
    stats = RunStats()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context()
        page = await context.new_page()

        await login_wait(page)

        # Conversation rows in Messenger Web can be listitems or grid rows.
        rows = page.locator("[role='row'], [role='listitem']")
        total = await rows.count()

        for idx in range(total):
            row = rows.nth(idx)
            stats.scanned += 1

            row_text = (await row.inner_text()).strip().lower()
            if name_contains and name_contains.lower() not in row_text:
                continue

            stats.matched += 1
            ok = await delete_conversation(row, dry_run=dry_run)
            if ok:
                stats.deleted += 1
                print(f"Deleted/matched conversation #{stats.deleted}: {row_text[:60]!r}")

            if max_delete > 0 and stats.deleted >= max_delete:
                break

        await context.close()
        await browser.close()

    return stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Delete Messenger conversations from your own account")
    parser.add_argument("--max-delete", type=int, default=10, help="Maximum conversations to delete (0 = unlimited)")
    parser.add_argument("--name-contains", type=str, default=None, help="Only target chats containing this text")
    parser.add_argument("--dry-run", action="store_true", help="Match conversations without deleting")
    parser.add_argument("--headless", action="store_true", help="Run browser in headless mode")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    result = asyncio.run(
        run(
            max_delete=args.max_delete,
            name_contains=args.name_contains,
            dry_run=args.dry_run,
            headless=args.headless,
        )
    )
    print(
        f"Done. scanned={result.scanned}, matched={result.matched}, deleted={result.deleted}, dry_run={args.dry_run}"
    )

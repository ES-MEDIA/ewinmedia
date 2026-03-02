const WAIT_SHORT = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function textMatches(el, words) {
  const text = (el?.textContent || '').trim().toLowerCase();
  return words.some((word) => text.includes(word));
}

function queryByText(selectors, words) {
  const list = Array.from(document.querySelectorAll(selectors));
  return list.find((el) => textMatches(el, words));
}

function isLoggedOut() {
  const bodyText = document.body?.innerText?.toLowerCase() || '';
  return bodyText.includes('log in') || bodyText.includes('تسجيل الدخول');
}

async function sendMessageToOpenThread(message) {
  if (isLoggedOut()) {
    throw new Error('يجب تسجيل الدخول إلى فيسبوك أولاً.');
  }

  const composer = document.querySelector('[contenteditable="true"][role="textbox"]');
  if (!composer) {
    throw new Error('افتح محادثة أولاً ثم أعد المحاولة.');
  }

  composer.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, message);
  composer.dispatchEvent(new InputEvent('input', { bubbles: true }));

  await sleep(150);

  composer.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Enter',
      code: 'Enter'
    })
  );

  composer.dispatchEvent(
    new KeyboardEvent('keyup', {
      bubbles: true,
      key: 'Enter',
      code: 'Enter'
    })
  );

  return { ok: true };
}

function getThreadItems() {
  const candidates = Array.from(
    document.querySelectorAll('[role="listitem"], [role="row"], li')
  );

  return candidates.filter((node) => {
    const hasMenuButton = node.querySelector('div[role="button"], button');
    return Boolean(hasMenuButton);
  });
}

async function deleteSingleThread(item) {
  item.scrollIntoView({ block: 'center' });
  await sleep(200);

  const menuButton =
    item.querySelector('div[role="button"][aria-label], button[aria-label]') ||
    item.querySelector('div[role="button"], button');

  if (!menuButton) return false;

  menuButton.click();
  await sleep(WAIT_SHORT);

  const deleteButton = queryByText('[role="menuitem"], div[role="button"], span', [
    'delete chat',
    'delete conversation',
    'حذف الدردشة',
    'حذف المحادثة'
  ]);

  if (!deleteButton) {
    document.body.click();
    await sleep(100);
    return false;
  }

  deleteButton.click();
  await sleep(WAIT_SHORT);

  const confirmDelete = queryByText('button, div[role="button"], span', [
    'delete chat',
    'delete',
    'حذف'
  ]);

  if (confirmDelete) {
    confirmDelete.click();
    await sleep(700);
  }

  return true;
}

async function deleteAllVisibleChats() {
  if (isLoggedOut()) {
    throw new Error('يجب تسجيل الدخول إلى فيسبوك أولاً.');
  }

  let deletedCount = 0;
  let processed = 0;

  while (processed < 80) {
    const items = getThreadItems();
    if (!items.length) break;

    const target = items[0];
    const deleted = await deleteSingleThread(target);

    if (!deleted) {
      processed += 1;
      target.remove();
      continue;
    }

    deletedCount += 1;
    processed += 1;
    await sleep(400);
  }

  return { ok: true, deletedCount };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === 'SEND_MESSAGE') {
      const result = await sendMessageToOpenThread(message.payload.message);
      sendResponse(result);
      return;
    }

    if (message.type === 'DELETE_ALL_CHATS') {
      const result = await deleteAllVisibleChats();
      sendResponse(result);
      return;
    }

    sendResponse({ ok: false, error: 'Unknown action' });
  })().catch((error) => {
    sendResponse({ ok: false, error: error.message || 'Unknown error' });
  });

  return true;
});

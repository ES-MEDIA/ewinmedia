const statusEl = document.getElementById('status');

function setStatus(message, kind = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`.trim();
}

async function withActiveFacebookTab(handler) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id || !tab.url) {
    throw new Error('لا يوجد تبويب نشط.');
  }

  const supported = tab.url.includes('facebook.com') || tab.url.includes('messenger.com');
  if (!supported) {
    throw new Error('افتح فيسبوك أو ماسنجر أولاً ثم أعد المحاولة.');
  }

  return handler(tab.id);
}

async function sendAction(action, payload = {}) {
  return withActiveFacebookTab((tabId) =>
    chrome.tabs.sendMessage(tabId, {
      type: action,
      payload
    })
  );
}

document.getElementById('sendMessage').addEventListener('click', async () => {
  const message = document.getElementById('message').value.trim();
  if (!message) {
    setStatus('اكتب رسالة قبل الإرسال.', 'error');
    return;
  }

  setStatus('جاري إرسال الرسالة...');

  try {
    const response = await sendAction('SEND_MESSAGE', { message });
    if (!response?.ok) {
      throw new Error(response?.error || 'فشل إرسال الرسالة.');
    }
    setStatus('تم إرسال الرسالة بنجاح.', 'success');
  } catch (error) {
    setStatus(error.message || 'حدث خطأ أثناء الإرسال.', 'error');
  }
});

document.getElementById('deleteChats').addEventListener('click', async () => {
  const accepted = confirm('هل أنت متأكد من حذف المحادثات الظاهرة؟');
  if (!accepted) {
    return;
  }

  setStatus('جاري حذف المحادثات...');

  try {
    const response = await sendAction('DELETE_ALL_CHATS');
    if (!response?.ok) {
      throw new Error(response?.error || 'فشل حذف المحادثات.');
    }
    setStatus(`تم حذف ${response.deletedCount} محادثة.`, 'success');
  } catch (error) {
    setStatus(error.message || 'حدث خطأ أثناء الحذف.', 'error');
  }
});

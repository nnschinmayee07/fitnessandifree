export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error('Email credentials are not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      console.error('Email send failed', response.status, await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send threw', err);
    return false;
  }
}

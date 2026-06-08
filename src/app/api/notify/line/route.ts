export async function POST(request: Request) {
  const { token, message } = await request.json();
  if (!token || !message) {
    return Response.json({ error: 'token and message required' }, { status: 400 });
  }
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

import { auth } from './firebase';

export const getHeaders = async () => {
  const user = auth.currentUser;
  let token = 'user_token';
  if (user) {
    try {
      token = await user.getIdToken();
    } catch(e) {}
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-user-id': user?.uid || 'guest'
  };
};

export const placeBet = async (amount: number, number: number) => {
  const res = await fetch('/api/game/bet', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ amount, number })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Bet failed');
  return data;
};

export const deposit = async (amount: number) => {
  const res = await fetch('/api/user/deposit', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ amount })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Deposit failed');
  return data;
};

export const withdraw = async (amount: number) => {
  const res = await fetch('/api/user/withdraw', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ amount })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Withdraw failed');
  return data;
};

export const getGameState = async () => {
  const res = await fetch('/api/game/state', { headers: await getHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export const getGameHistory = async () => {
  const res = await fetch('/api/game/history', { headers: await getHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export const getUserProfile = async () => {
  const res = await fetch('/api/user/profile', { headers: await getHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export const getUserBets = async () => {
  const res = await fetch('/api/user/bets', { headers: await getHeaders() });
  if (!res.ok) return [];
  return res.json();
}

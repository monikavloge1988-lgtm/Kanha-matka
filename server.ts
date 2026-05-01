import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
app.use(express.json());

// In-Memory Database
const MEMORY_DB = {
  users: new Map<string, { balance: number }>(),
  bets: new Map<string, Array<{ id: string, userId: string, amount: number, number: number, status: string, payout: number }>>(),
  history: [] as { roundId: string, resultNumber: number, timestamp: number }[],
  gameState: {
    status: 'betting', // betting, spinning, result
    roundId: Math.random().toString(36).substring(2, 10),
    roundEndTime: Date.now() + 30000,
    resultNumber: null as number | null,
    updatedAt: Date.now()
  }
};

const ROUND_DURATION_MS = 30000;
const SPIN_DURATION_MS = 10000;
const PAYOUT_MULTIPLIER = 8;

// Simulated Authentication Middleware (Trusts the UID sent by client for demo purposes)
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const uid = req.headers['x-user-id'];
  if (!uid) return res.status(401).json({ error: 'Missing x-user-id header' });
  
  req.user = { uid };
  
  if (!MEMORY_DB.users.has(uid as string)) {
    MEMORY_DB.users.set(uid as string, { balance: 1000 }); // give starting balance
  }
  next();
};

app.get('/api/game/state', (req, res) => {
  console.log('GET /api/game/state');
  res.json(MEMORY_DB.gameState);
});

app.get('/api/game/history', (req, res) => {
  res.json(MEMORY_DB.history.slice(-20)); // Return last 20 results
});

app.post('/api/game/bet', authenticate, (req, res) => {
  const { amount, number } = req.body;
  const uid = (req as any).user.uid;

  if (MEMORY_DB.gameState.status !== 'betting') {
    return res.status(400).json({ error: 'Betting is closed' });
  }

  if (amount <= 0 || number < 0 || number > 9) {
    return res.status(400).json({ error: 'Invalid bet' });
  }

  const user = MEMORY_DB.users.get(uid)!;
  if (user.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Deduct balance
  user.balance -= amount;

  // Record bet
  const roundBets = MEMORY_DB.bets.get(MEMORY_DB.gameState.roundId) || [];
  const betId = Math.random().toString(36).substring(2, 10);
  roundBets.push({
    id: betId,
    userId: uid,
    amount,
    number,
    status: 'pending',
    payout: 0
  });
  MEMORY_DB.bets.set(MEMORY_DB.gameState.roundId, roundBets);

  res.json({ success: true, betId, newBalance: user.balance });
});

app.get('/api/user/bets', authenticate, (req, res) => {
  const uid = (req as any).user.uid;
  let myBets: any[] = [];
  MEMORY_DB.bets.forEach((roundBets, roundId) => {
    myBets = myBets.concat(roundBets.filter(b => b.userId === uid).map(b => ({ ...b, roundId })));
  });
  res.json(myBets.reverse());
});

app.get('/api/user/profile', authenticate, (req, res) => {
  const uid = (req as any).user.uid;
  res.json(MEMORY_DB.users.get(uid));
});

app.post('/api/user/deposit', authenticate, (req, res) => {
  const { amount } = req.body;
  const uid = (req as any).user.uid;
  if (amount <= 0) return res.status(400).json({ error: 'Invalid config' });
  const user = MEMORY_DB.users.get(uid)!;
  user.balance += amount;
  res.json({ success: true, balance: user.balance });
});

app.post('/api/user/withdraw', authenticate, (req, res) => {
  const { amount } = req.body;
  const uid = (req as any).user.uid;
  const user = MEMORY_DB.users.get(uid)!;
  if (amount > user.balance) return res.status(400).json({ error: 'Insufficient funds' });
  user.balance -= amount;
  res.json({ success: true, balance: user.balance });
});

// Game Loop
setInterval(() => {
  const now = Date.now();
  const timeRemaining = MEMORY_DB.gameState.roundEndTime - now;

  if (MEMORY_DB.gameState.status === 'betting' && timeRemaining <= SPIN_DURATION_MS) {
    MEMORY_DB.gameState.status = 'spinning';
    MEMORY_DB.gameState.resultNumber = null;
    MEMORY_DB.gameState.updatedAt = now;
    console.log(`[Round ${MEMORY_DB.gameState.roundId}] SPINNING`);
  } else if (MEMORY_DB.gameState.status === 'spinning' && timeRemaining <= 0) {
    MEMORY_DB.gameState.status = 'result';
    MEMORY_DB.gameState.resultNumber = Math.floor(Math.random() * 10);
    MEMORY_DB.gameState.updatedAt = now;
    
    const { roundId, resultNumber } = MEMORY_DB.gameState;
    console.log(`[Round ${roundId}] RESULT: ${resultNumber}`);

    // Process Bets
    const roundBets = MEMORY_DB.bets.get(roundId) || [];
    roundBets.forEach(bet => {
      if (bet.number === resultNumber) {
        bet.status = 'won';
        bet.payout = bet.amount * PAYOUT_MULTIPLIER;
        const user = MEMORY_DB.users.get(bet.userId);
        if (user) user.balance += bet.payout;
      } else {
        bet.status = 'lost';
      }
    });

    MEMORY_DB.history.push({ roundId, resultNumber, timestamp: now });

    setTimeout(() => {
      MEMORY_DB.gameState.status = 'betting';
      MEMORY_DB.gameState.roundId = Math.random().toString(36).substring(2, 10);
      MEMORY_DB.gameState.roundEndTime = Date.now() + ROUND_DURATION_MS;
      MEMORY_DB.gameState.resultNumber = null;
      MEMORY_DB.gameState.updatedAt = Date.now();
      console.log(`[Round ${MEMORY_DB.gameState.roundId}] BETTING`);
    }, 5000);
  }
}, 1000);

async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false // Disable HMR to prevent websocket port conflicts
        },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { startIngestionService } from './services/ingestion.service';
import apiRouter from './routes/api';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use('/api', apiRouter);

app.get('/api/health', (req, res) => {
  res.send({ status: 'ok' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Backend server is running on port ${port}`);
  startIngestionService();
});
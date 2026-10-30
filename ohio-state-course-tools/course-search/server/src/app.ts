import express from 'express';
import cors from 'cors';
import { courseRoutes } from './routes/courseRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/courses', courseRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

import cors from 'cors';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors("*"));
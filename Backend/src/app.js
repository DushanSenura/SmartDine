const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const apiRoutes = require('./routes/api.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'SmartDine API',
    status: 'running',
    version: '1.0.0',
  });
});

app.use('/api/health', healthRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
  });
});

module.exports = app;
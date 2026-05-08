import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_TARGET = process.env.VITE_ERPNEXT_URL || 'https://erpnext.imsc-eg.com';

// 1. Proxy API requests to ERPNext (Without stripping /api)
const apiProxy = createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  secure: false, // Allows proxying to HTTP from HTTPS
  cookieDomainRewrite: "imsc-delivery.onrender.com", // Allows cookies to work cross-domain if needed
  on: {
    proxyReq: (proxyReq, req, res) => {
      console.log(`[Proxy] ${req.method} ${req.url}`);
    },
    error: (err, req, res) => {
      console.error('[Proxy Error]', err);
    }
  }
});

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    return apiProxy(req, res, next);
  }
  next();
});


// 2. Serve static frontend files from 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// 3. Fallback for React Router (using regex to avoid Express path-to-regexp errors)
app.get(/^(.*)$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} and proxying /api to ${API_TARGET}`);
});

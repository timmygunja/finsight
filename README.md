# finsight

# ===== FINSIGHT MONITORING SETUP GUIDE - NEW =====

## 🚀 How to Start the Project with Monitoring

### Prerequisites
1. Docker and Docker Compose installed
2. Environment variables configured
3. API keys for AI services

### 📋 Environment Variables Required
Create a `.env` file in your project root:

\`\`\`bash
# ===== AI SERVICE API KEYS =====
OPENROUTER_API_KEY=your_openrouter_key_here

# ===== DATABASE CONFIGURATION =====
MONGODB_URI=mongodb://finsight_user:finsight_password@mongodb:27017/finsight

# ===== REDIS CONFIGURATION =====
REDIS_URL=redis://redis:6379

# ===== APPLICATION SETTINGS =====
NODE_ENV=production
PORT=5000
\`\`\`

### 🐳 Starting the Complete Stack

1. **Clone and navigate to your project:**
\`\`\`bash
git clone <your-repo>
cd finsight-analytics
\`\`\`

2. **Start all services with Docker Compose:**
\`\`\`bash
# Start all services (Client, Server, MongoDB, Redis, Prometheus, Grafana)
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
\`\`\`

3. **Verify services are running:**
\`\`\`bash
# Check health endpoints
curl http://localhost:5000/health
curl http://localhost:5000/redis-status
curl http://localhost:9090/-/healthy
\`\`\`

### 📊 Accessing Monitoring Dashboards

#### **Grafana Dashboard**
- **URL:** http://localhost:3001
- **Username:** admin
- **Password:** admin
- **Default Dashboard:** Finsight Analytics Overview

#### **Prometheus Metrics**
- **URL:** http://localhost:9090
- **Targets:** http://localhost:9090/targets
- **Raw Metrics:** http://localhost:5000/metrics

#### **Application URLs**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

### 🔍 What You Can Monitor

#### **Application Metrics**
- HTTP request rates and response times
- AI service performance and latency
- Cache hit/miss ratios
- Active users and conversations
- Visualization generation rates
- Error rates and types

#### **System Metrics**
- Memory usage (heap, total, external, RSS)
- CPU usage (via node-exporter)
- Database connection status
- Redis connection status

#### **Business Metrics**
- Number of AI requests per service
- File processing times
- Visualization types generated
- User activity patterns

### 🛠️ Troubleshooting

#### **Common Issues:**

1. **Redis Connection Failed:**
\`\`\`bash
# Check Redis container
docker-compose logs redis

# Restart Redis
docker-compose restart redis
\`\`\`

2. **Prometheus Not Scraping:**
\`\`\`bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify server metrics endpoint
curl http://localhost:5000/metrics
\`\`\`

3. **Grafana Dashboard Not Loading:**
\`\`\`bash
# Check Grafana logs
docker-compose logs grafana

# Restart Grafana
docker-compose restart grafana
\`\`\`

4. **MongoDB Connection Issues:**
\`\`\`bash
# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
\`\`\`

### 📈 Monitoring Best Practices

#### **Key Metrics to Watch:**
1. **Response Time:** Keep HTTP requests under 2 seconds
2. **Error Rate:** Should be below 1%
3. **Cache Hit Rate:** Aim for 70%+ for AI responses
4. **Memory Usage:** Monitor for memory leaks
5. **AI Service Latency:** Track which services are fastest

#### **Alerting Setup (Optional):**
Add alerting rules to `prometheus.yml`:
\`\`\`yaml
rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
\`\`\`

### 🔧 Development Mode

For development without Docker:

1. **Start Redis locally:**
\`\`\`bash
redis-server
\`\`\`

2. **Start MongoDB locally:**
\`\`\`bash
mongod --dbpath /path/to/data
\`\`\`

3. **Start the application:**
\`\`\`bash
npm install
npm run dev
\`\`\`

4. **Start Prometheus (optional):**
\`\`\`bash
prometheus --config.file=prometheus.yml
\`\`\`

### 📊 Custom Metrics

To add custom metrics to your application:

\`\`\`javascript
// In your service files
const { metrics } = require('./lib/metrics');

// Increment a counter
metrics.customCounter.inc({ label: 'value' });

// Record a histogram
metrics.customHistogram.observe({ label: 'value' }, duration);

// Set a gauge
metrics.customGauge.set({ label: 'value' }, currentValue);
\`\`\`

### 🎯 Performance Optimization

#### **Redis Caching:**
- AI responses cached for 1 hour
- Visualizations cached for 2 hours
- User sessions cached for 24 hours

#### **Monitoring Overhead:**
- Metrics collection adds ~1-2ms per request
- Redis operations add ~0.1-1ms per request
- Total monitoring overhead: <5ms per request

### 🔒 Security Considerations

1. **Change default Grafana password**
2. **Enable Redis authentication in production**
3. **Use HTTPS in production**
4. **Restrict Prometheus/Grafana access**
5. **Monitor for suspicious activity patterns**

### 📝 Logs and Debugging

#### **View application logs:**
\`\`\`bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f redis
docker-compose logs -f prometheus
docker-compose logs -f grafana
\`\`\`

#### **Debug metrics:**
\`\`\`bash
# Check if metrics are being generated
curl http://localhost:5000/metrics | grep finsight

# Check Prometheus scraping
curl http://localhost:9090/api/v1/query?query=up
\`\`\`

This monitoring setup provides comprehensive observability into application, helping identify performance bottlenecks, track user behavior, and ensure system reliability.

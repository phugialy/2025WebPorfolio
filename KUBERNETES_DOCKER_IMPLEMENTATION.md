# Kubernetes + Docker Microservices Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX Ingress Controller                    │
│                        (Load Balancer)                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────────────┐
│                     │                                           │
│  ┌─────────────────▼─────────────────┐  ┌─────────────────────┐ │
│  │      Frontend Service              │  │   Weather Service   │ │
│  │      (Next.js App)                 │  │   (Node.js API)     │ │
│  │  - Static pages                    │  │  - Open-Meteo API    │ │
│  │  - Dynamic routes                  │  │  - Geolocation      │ │
│  │  - Theme management                │  │  - Redis caching     │ │
│  └────────────────────────────────────┘  └─────────────────────┘ │
│                     │                           │                │
│  ┌─────────────────▼─────────────────┐  ┌─────▼─────────────────┐ │
│  │      Contact Service              │  │   Content Service     │ │
│  │  - Contact forms                  │  │  - MDX processing     │ │
│  │  - Guestbook                      │  │  - RSS harvesting      │ │
│  │  - Rate limiting                  │  │  - File storage        │ │
│  └────────────────────────────────────┘  └─────────────────────┘ │
│                     │                           │                │
│  ┌─────────────────▼─────────────────┐  ┌─────▼─────────────────┐ │
│  │      Database Service             │  │   Monitoring          │ │
│  │  - Convex backend                 │  │  - Prometheus         │ │
│  │  - Data persistence               │  │  - Grafana            │ │
│  │  - Real-time updates              │  │  - Alerting           │ │
│  └────────────────────────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: Docker Containers

### Frontend Service Dockerfile

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Weather Service Dockerfile

```dockerfile
# services/weather/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S weather -u 1001
USER weather

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "index.js"]
```

### Weather Service Implementation

```javascript
// services/weather/index.js
const express = require('express');
const cors = require('cors');
const Redis = require('redis');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// Redis client for caching
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis-service:6379'
});

redis.on('error', (err) => console.log('Redis Client Error', err));
redis.connect();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'weather-service',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0'
  });
});

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Create cache key
    const cacheKey = `weather:${lat}:${lon}`;
    
    // Try to get from cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Fetch from Open-Meteo API
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,weather_code',
        daily: 'temperature_2m_max,temperature_2m_min,weather_code',
        timezone: 'auto'
      }
    });

    const weatherData = response.data;
    
    // Cache for 10 minutes
    await redis.setEx(cacheKey, 600, JSON.stringify(weatherData));
    
    res.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Weather service running on port ${port}`);
});
```

### Contact Service Dockerfile

```dockerfile
# services/contact/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S contact -u 1001
USER contact

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "index.js"]
```

### Contact Service Implementation

```javascript
// services/contact/index.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3002;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'contact-service',
    timestamp: new Date().toISOString()
  });
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Here you would integrate with Convex
    // For now, just log the submission
    console.log('Contact form submission:', { name, email, message });
    
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Guestbook endpoint
app.post('/api/guestbook', async (req, res) => {
  try {
    const { name, message } = req.body;
    
    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required' });
    }

    console.log('Guestbook entry:', { name, message });
    
    res.json({ success: true, message: 'Entry added successfully' });
  } catch (error) {
    console.error('Guestbook error:', error);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Contact service running on port ${port}`);
});
```

## Step 2: Kubernetes Manifests

### Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: portfolio
  labels:
    name: portfolio
```

### ConfigMaps

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: portfolio-config
  namespace: portfolio
data:
  NODE_ENV: "production"
  REDIS_URL: "redis://redis-service:6379"
  OPEN_METEO_API_URL: "https://api.open-meteo.com"
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: portfolio-secrets
  namespace: portfolio
type: Opaque
data:
  # Base64 encoded values
  CONVEX_URL: <base64-encoded-convex-url>
  CONVEX_DEPLOY_KEY: <base64-encoded-deploy-key>
```

### Frontend Deployment

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-service
  namespace: portfolio
  labels:
    app: frontend-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend-service
  template:
    metadata:
      labels:
        app: frontend-service
    spec:
      containers:
      - name: frontend
        image: your-registry/portfolio-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: portfolio-config
              key: NODE_ENV
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: portfolio
spec:
  selector:
    app: frontend-service
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### Weather Service Deployment

```yaml
# k8s/weather-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: weather-service
  namespace: portfolio
  labels:
    app: weather-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: weather-service
  template:
    metadata:
      labels:
        app: weather-service
    spec:
      containers:
      - name: weather
        image: your-registry/weather-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: portfolio-config
              key: REDIS_URL
        - name: OPEN_METEO_API_URL
          valueFrom:
            configMapKeyRef:
              name: portfolio-config
              key: OPEN_METEO_API_URL
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: weather-service
  namespace: portfolio
spec:
  selector:
    app: weather-service
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

### Contact Service Deployment

```yaml
# k8s/contact-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: contact-service
  namespace: portfolio
  labels:
    app: contact-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: contact-service
  template:
    metadata:
      labels:
        app: contact-service
    spec:
      containers:
      - name: contact
        image: your-registry/contact-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: CONVEX_URL
          valueFrom:
            secretKeyRef:
              name: portfolio-secrets
              key: CONVEX_URL
        - name: CONVEX_DEPLOY_KEY
          valueFrom:
            secretKeyRef:
              name: portfolio-secrets
              key: CONVEX_DEPLOY_KEY
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: contact-service
  namespace: portfolio
spec:
  selector:
    app: contact-service
  ports:
  - port: 80
    targetPort: 3002
  type: ClusterIP
```

### Redis Deployment

```yaml
# k8s/redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: portfolio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: portfolio
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: portfolio
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: portfolio-ingress
  namespace: portfolio
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: portfolio-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
      - path: /api/weather
        pathType: Prefix
        backend:
          service:
            name: weather-service
            port:
              number: 80
      - path: /api/contact
        pathType: Prefix
        backend:
          service:
            name: contact-service
            port:
              number: 80
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: portfolio
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: weather-hpa
  namespace: portfolio
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: weather-service
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Step 3: CI/CD Pipeline

### GitHub Actions for Kubernetes

```yaml
# .github/workflows/k8s-deploy.yml
name: Kubernetes Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Frontend
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./Dockerfile.frontend
        push: true
        tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

    - name: Build and push Weather Service
      uses: docker/build-push-action@v5
      with:
        context: ./services/weather
        push: true
        tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-weather:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

    - name: Build and push Contact Service
      uses: docker/build-push-action@v5
      with:
        context: ./services/contact
        push: true
        tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-contact:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'

    - name: Deploy to Kubernetes
      run: |
        # Update image tags in manifests
        sed -i "s|your-registry/portfolio-frontend:latest|${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}|g" k8s/*.yaml
        sed -i "s|your-registry/weather-service:latest|${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-weather:${{ github.sha }}|g" k8s/*.yaml
        sed -i "s|your-registry/contact-service:latest|${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-contact:${{ github.sha }}|g" k8s/*.yaml
        
        # Apply manifests
        kubectl apply -f k8s/
        
        # Wait for rollout
        kubectl rollout status deployment/frontend-service -n portfolio
        kubectl rollout status deployment/weather-service -n portfolio
        kubectl rollout status deployment/contact-service -n portfolio
```

## Step 4: Monitoring Setup

### Prometheus ConfigMap

```yaml
# k8s/monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: portfolio
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### Grafana Dashboard

```yaml
# k8s/grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: portfolio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: grafana-service
  namespace: portfolio
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

## Step 5: Deployment Commands

### Local Development with Minikube

```bash
# Start Minikube
minikube start

# Enable ingress addon
minikube addons enable ingress

# Build and load images
eval $(minikube docker-env)
docker build -f Dockerfile.frontend -t portfolio-frontend:latest .
docker build -f services/weather/Dockerfile -t weather-service:latest ./services/weather
docker build -f services/contact/Dockerfile -t contact-service:latest ./services/contact

# Deploy to Kubernetes
kubectl apply -f k8s/

# Check status
kubectl get pods -n portfolio
kubectl get services -n portfolio
kubectl get ingress -n portfolio

# Get external IP
minikube ip
```

### Production Deployment

```bash
# Set up kubectl context for your cluster
kubectl config set-context your-cluster

# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply secrets (update with your values)
kubectl apply -f k8s/secrets.yaml

# Apply configmaps
kubectl apply -f k8s/configmap.yaml

# Deploy services
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/weather-deployment.yaml
kubectl apply -f k8s/contact-deployment.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml

# Deploy monitoring
kubectl apply -f k8s/monitoring.yaml

# Check deployment
kubectl get all -n portfolio
```

## Benefits of This Approach

### 🚀 **Scalability**
- Auto-scaling based on CPU/memory usage
- Horizontal scaling across multiple nodes
- Load balancing across service replicas

### 🛡️ **Reliability**
- Self-healing containers
- Rolling updates with zero downtime
- Health checks and readiness probes

### 🔧 **Maintainability**
- Service isolation and independent deployments
- Easy rollbacks and version management
- Centralized logging and monitoring

### 💰 **Cost Optimization**
- Resource limits and requests
- Efficient resource utilization
- Auto-scaling based on demand

### 🔒 **Security**
- Network policies for service isolation
- Secrets management
- RBAC for access control

## Next Steps

1. **Set up local Kubernetes** (Minikube or Docker Desktop)
2. **Create Docker containers** for each service
3. **Deploy to Kubernetes** using the provided manifests
4. **Set up CI/CD pipeline** with GitHub Actions
5. **Configure monitoring** with Prometheus and Grafana
6. **Deploy to production** cloud provider

This Kubernetes + Docker approach gives you enterprise-grade orchestration with full control over your microservices architecture!


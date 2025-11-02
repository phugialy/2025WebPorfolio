# Microservices Deployment Guide for Portfolio App

## Overview

This guide provides step-by-step instructions for deploying your Next.js portfolio app using containerized microservices with full orchestration.

## Architecture Breakdown

### Current Monolithic Structure → Microservices

| Current Component | Microservice | Technology | Purpose |
|------------------|--------------|------------|---------|
| Next.js App | Frontend Service | Next.js + Docker | Static pages, dynamic routes |
| API Routes | API Gateway | NGINX/Traefik | Request routing, load balancing |
| Weather API | Weather Service | Node.js + Express | Weather data, caching |
| Contact/Guestbook | Contact Service | Node.js + Express | Form handling, moderation |
| Convex Backend | Database Service | Convex + Docker | Data persistence |
| Content Management | Content Service | Node.js + Express | MDX processing, RSS |
| GitHub Actions | CI/CD Pipeline | GitHub Actions + Docker | Automated deployment |

## Implementation Options

### Option 1: Kubernetes (Full Orchestration)

#### Prerequisites
- Docker Desktop with Kubernetes enabled
- kubectl CLI
- Helm (optional, for package management)

#### Step 1: Containerize Each Service

**Frontend Service Dockerfile**
```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

**Weather Service Dockerfile**
```dockerfile
# Dockerfile.weather-service
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "weather-service.js"]
```

#### Step 2: Kubernetes Manifests

**Frontend Deployment**
```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-service
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
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**Weather Service Deployment**
```yaml
# k8s/weather-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: weather-service
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
        - name: OPEN_METEO_API_URL
          value: "https://api.open-meteo.com"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

**Services**
```yaml
# k8s/services.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  selector:
    app: frontend-service
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: v1
kind: Service
metadata:
  name: weather-service
spec:
  selector:
    app: weather-service
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

**Ingress Controller**
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: portfolio-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
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
```

#### Step 3: Deployment Commands

```bash
# Build and push images
docker build -f Dockerfile.frontend -t your-registry/portfolio-frontend:latest .
docker build -f Dockerfile.weather -t your-registry/weather-service:latest .

# Deploy to Kubernetes
kubectl apply -f k8s/
kubectl get pods
kubectl get services
```

### Option 2: Docker Compose (Simpler Approach)

#### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - weather-service
      - contact-service

  weather-service:
    build:
      context: ./services/weather
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - OPEN_METEO_API_URL=https://api.open-meteo.com
    volumes:
      - weather-cache:/app/cache

  contact-service:
    build:
      context: ./services/contact
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - CONVEX_URL=${CONVEX_URL}
      - CONVEX_DEPLOY_KEY=${CONVEX_DEPLOY_KEY}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - weather-service
      - contact-service

volumes:
  weather-cache:
```

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream weather {
        server weather-service:3001;
    }

    upstream contact {
        server contact-service:3002;
    }

    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/weather {
            proxy_pass http://weather;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/contact {
            proxy_pass http://contact;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### Option 3: Managed Container Services

#### AWS App Runner
```yaml
# apprunner.yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - echo "Building the application"
      - npm install
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

#### Azure Container Apps
```yaml
# container-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portfolio-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: portfolio
  template:
    metadata:
      labels:
        app: portfolio
    spec:
      containers:
      - name: portfolio
        image: your-registry/portfolio:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
```

## Service Separation Strategy

### 1. Frontend Service
- **Responsibility**: Static pages, dynamic routes, client-side rendering
- **Technology**: Next.js with static export or SSR
- **Scaling**: Horizontal scaling based on traffic

### 2. Weather Service
- **Responsibility**: Weather API integration, caching, geolocation
- **Technology**: Node.js + Express
- **Database**: Redis for caching
- **Scaling**: Scale based on API usage patterns

### 3. Contact Service
- **Responsibility**: Contact forms, guestbook, rate limiting
- **Technology**: Node.js + Express
- **Database**: Convex (existing)
- **Scaling**: Scale based on form submissions

### 4. Content Service
- **Responsibility**: MDX processing, RSS harvesting, content management
- **Technology**: Node.js + Express
- **Storage**: File system or object storage
- **Scaling**: Scale based on content processing needs

### 5. Database Service
- **Responsibility**: Data persistence, real-time updates
- **Technology**: Convex (containerized)
- **Scaling**: Managed by Convex cloud

## CI/CD Pipeline Updates

### GitHub Actions for Microservices

```yaml
# .github/workflows/microservices-deploy.yml
name: Microservices Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Frontend
        run: |
          docker build -f Dockerfile.frontend -t frontend:${{ github.sha }} .
      
      - name: Build Weather Service
        run: |
          docker build -f services/weather/Dockerfile -t weather:${{ github.sha }} .
      
      - name: Run Tests
        run: |
          docker-compose -f docker-compose.test.yml up --abort-on-container-exit
      
      - name: Push to Registry
        run: |
          docker push your-registry/frontend:${{ github.sha }}
          docker push your-registry/weather:${{ github.sha }}

  deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/frontend-service frontend=your-registry/frontend:${{ github.sha }}
          kubectl set image deployment/weather-service weather=your-registry/weather:${{ github.sha }}
          kubectl rollout status deployment/frontend-service
          kubectl rollout status deployment/weather-service
```

## Monitoring and Observability

### 1. Health Checks
```javascript
// health-check.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'weather-service',
    version: process.env.VERSION || '1.0.0'
  });
});
```

### 2. Logging
```yaml
# k8s/logging.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
    </source>
```

### 3. Metrics
```yaml
# k8s/metrics.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus
        ports:
        - containerPort: 9090
```

## Security Considerations

### 1. Network Policies
```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: portfolio-network-policy
spec:
  podSelector:
    matchLabels:
      app: portfolio
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
```

### 2. Secrets Management
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: portfolio-secrets
type: Opaque
data:
  convex-url: <base64-encoded-url>
  api-key: <base64-encoded-key>
```

## Cost Optimization

### 1. Resource Limits
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

### 2. Horizontal Pod Autoscaler
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
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
```

## Migration Strategy

### Phase 1: Containerization
1. Create Dockerfiles for each service
2. Test locally with Docker Compose
3. Set up CI/CD pipeline

### Phase 2: Service Separation
1. Extract API routes to separate services
2. Implement service-to-service communication
3. Update frontend to use service endpoints

### Phase 3: Orchestration
1. Deploy to Kubernetes or managed service
2. Implement monitoring and logging
3. Set up auto-scaling

### Phase 4: Optimization
1. Implement caching strategies
2. Optimize resource usage
3. Set up advanced monitoring

## Recommended Approach for Your Portfolio

Given your current setup, I recommend **Option 2 (Docker Compose)** as the starting point because:

1. **Lower Complexity**: Easier to understand and maintain
2. **Cost Effective**: No Kubernetes cluster management costs
3. **Quick Migration**: Can containerize existing code with minimal changes
4. **Scalability**: Can migrate to Kubernetes later if needed

### Next Steps

1. **Start with Docker Compose** for local development
2. **Containerize your existing services** one by one
3. **Set up CI/CD** with Docker builds
4. **Deploy to cloud** using managed container services
5. **Monitor and optimize** based on usage patterns

Would you like me to help you implement any specific part of this microservices architecture?


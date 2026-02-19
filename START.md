# Quick Start Commands

## Every Time You Start Working

### 1. Start Docker Containers
```bash
docker start leave-postgres leave-redis
```

### 2. Verify Containers are Running
```bash
docker ps
```

### 3. Start the Bot
```bash
cd /Users/macbook/Documents/Work/chatbot
bun run dev
```

---

## One-Liner
```bash
docker start leave-postgres leave-redis && sleep 2 && cd /Users/macbook/Documents/Work/chatbot && bun run dev
```

---

## Stop Everything
```bash
# Stop bot: Ctrl+C

# Stop Docker
docker stop leave-postgres leave-redis
```

---

## Health Check (If Issues)
```bash
# Check PostgreSQL
docker exec -it leave-postgres psql -U postgres -d leave_management -c "SELECT 1;"

# Check Redis
docker exec -it leave-redis redis-cli PING

# Check roster data
docker exec -it leave-postgres psql -U postgres -d leave_management -c "SELECT COUNT(*) FROM org_roster;"

# Check Redis jobs
docker exec -it leave-redis redis-cli KEYS "bull:*"
```

---

## Auto-Start Docker (Optional)
```bash
# Set containers to auto-start with Docker Desktop
docker update --restart unless-stopped leave-postgres
docker update --restart unless-stopped leave-redis
```

Then you only need: `bun run dev`

---

## Logs
```bash
# Bot logs: visible in terminal where you ran 'bun run dev'

# Docker logs
docker logs leave-postgres
docker logs leave-redis

# Production (if using pm2)
pm2 logs
```

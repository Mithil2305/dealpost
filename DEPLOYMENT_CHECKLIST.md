# DealPost Appwrite Deployment - Pre-Flight Checklist

## Phase 1: VPS Preparation ☐

- [ ] VPS provisioned (2GB+ RAM, 10GB+ storage, Ubuntu 20.04+)
- [ ] SSH access verified
- [ ] System updated: `apt update && apt upgrade -y`
- [ ] Docker installed and verified: `docker --version`
- [ ] Docker Compose installed and verified: `docker compose version`
- [ ] Firewall configured (ports 22, 80, 443 open)
- [ ] Domain DNS records pointing to VPS IP
- [ ] DNS propagation verified: `nslookup api.dealpost.in`

## Phase 2: Appwrite Deployment ☐

- [ ] Appwrite repository cloned: `~/appwrite/`
- [ ] Environment file created: `.env` with secure keys
- [ ] OpenSSL keys generated and configured
- [ ] Database passwords set (strong, 20+ chars)
- [ ] Docker Compose started: `docker compose up -d`
- [ ] All containers healthy: `docker ps` (all showing healthy)
- [ ] Appwrite responds to health check: `curl http://localhost/health`
- [ ] Logs reviewed for startup errors: `docker compose logs`

## Phase 3: SSL/HTTPS ☐

- [ ] Nginx installed: `sudo apt install nginx`
- [ ] Nginx configuration created: `/etc/nginx/sites-available/appwrite`
- [ ] Nginx config tested: `sudo nginx -t` (returns OK)
- [ ] Nginx enabled: `sudo systemctl enable nginx && sudo systemctl restart nginx`
- [ ] Certbot installed: `sudo apt install certbot python3-certbot-nginx`
- [ ] SSL certificate obtained: `sudo certbot certonly --nginx -d api.dealpost.in`
- [ ] Certificate verified: `sudo certbot certificates`
- [ ] HTTPS access working: `curl -I https://api.dealpost.in` (200 OK)
- [ ] Auto-renewal set up: `sudo systemctl enable certbot.timer`
- [ ] HSTS header configured in Nginx

## Phase 4: Appwrite Console Setup ☐

- [ ] Console accessed: https://api.dealpost.in
- [ ] Admin account created with strong password
- [ ] Project "DealPost" created with ID "dealpost"
- [ ] Platforms configured (dealpost.in, localhost:5173)
- [ ] CORS origins added (all required domains)
- [ ] Frontend API key generated and saved
- [ ] Backend API key generated and saved
- [ ] Database "dealpost" created (if not auto-created)
- [ ] All 7 collections created:
  - [ ] users
  - [ ] listings
  - [ ] conversations
  - [ ] messages
  - [ ] notifications
  - [ ] reports
  - [ ] likes
- [ ] All collection attributes added per schema
- [ ] All collection indexes created
- [ ] Collection permissions configured
- [ ] Storage buckets created:
  - [ ] avatars
  - [ ] listing-images
  - [ ] report-evidence

## Phase 5: Frontend Integration ☐

- [ ] Appwrite SDK installed: `npm install appwrite`
- [ ] Environment file updated with Appwrite credentials
- [ ] Appwrite service created: `src/services/appwrite.js`
- [ ] Auth hook created: `src/hooks/useAppwriteAuth.js`
- [ ] AuthContext updated to use Appwrite
- [ ] useAuth hook wrapper created
- [ ] Login component updated to use `authService.login()`
- [ ] Signup component updated to use `authService.signup()`
- [ ] Logout function uses `authService.logout()`
- [ ] Listings page uses `listingService.getListings()`
- [ ] File uploads use `fileService.uploadAvatar()` and `fileService.uploadListingImages()`
- [ ] Realtime subscriptions added where needed

## Phase 6: Backend Integration ☐

- [ ] Appwrite SDK installed: `npm install node-appwrite`
- [ ] Environment file updated with Appwrite credentials
- [ ] Appwrite service created: `src/services/appwrite.js`
- [ ] Auth middleware updated to verify Appwrite sessions
- [ ] User routes use `userService` instead of DB
- [ ] Listing routes use `listingService` instead of DB
- [ ] Message routes use `messageService` instead of DB
- [ ] Notification triggers added for:
  - [ ] New message
  - [ ] New like
  - [ ] Listing reported
- [ ] Error handling uses Appwrite error format
- [ ] All routes tested with Appwrite backend

## Phase 7: Testing ☐

- [ ] Frontend loads without JavaScript errors
- [ ] Signup flow works end-to-end
- [ ] Login flow works end-to-end
- [ ] Logout clears all session data
- [ ] Create listing works with images
- [ ] Fetch/display listings works
- [ ] Like/unlike functionality works
- [ ] Message send/receive works, appears in Appwrite
- [ ] Notifications appear after actions
- [ ] File uploads store in Appwrite Storage
- [ ] User can update profile
- [ ] Realtime updates work (if implemented)
- [ ] CORS errors not appearing
- [ ] No 401/403 authentication errors
- [ ] Database queries return correct data

## Phase 8: Performance & Monitoring ☐

- [ ] Health check endpoint responding: `curl https://api.dealpost.in/health`
- [ ] Response times reasonable (<500ms for queries)
- [ ] No memory leaks in logs
- [ ] Database queries optimized with indexes
- [ ] N+1 queries eliminated
- [ ] File uploads are reasonably fast
- [ ] Pagination working (if large datasets)
- [ ] Monitoring/logging configured
- [ ] Error tracking enabled (Sentry or similar - optional)

## Phase 9: Security ☐

- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] SSL certificate valid and auto-renewing
- [ ] HSTS enabled
- [ ] API keys NOT in version control
- [ ] Environment variables secure on VPS
- [ ] Firewall restricts unnecessary ports
- [ ] Database password strong (20+ chars)
- [ ] Admin console only accessible to authorized users
- [ ] CORS origins only allow expected domains
- [ ] File uploads validated (type, size)
- [ ] User permissions enforced in collections
- [ ] SQL injection/NoSQL injection prevented
- [ ] Rate limiting configured (if needed)
- [ ] Backups automated and tested

## Phase 10: Production Readiness ☐

- [ ] Docker containers set to restart on failure
- [ ] Persistent volumes configured for data
- [ ] Database backups automated (daily)
- [ ] Certificate renewal monitored
- [ ] Logs aggregated and monitored
- [ ] Rollback plan documented
- [ ] Disaster recovery plan in place
- [ ] Documentation updated
- [ ] Team trained on new stack
- [ ] Load balancer configured (if multi-server)
- [ ] CDN configured for static assets (optional)
- [ ] Analytics integrated (if needed)

## Phase 11: Post-Deployment ☐

- [ ] Monitor logs for first 24 hours: `docker compose logs -f`
- [ ] Test backup restore procedure
- [ ] Verify SSL renews automatically
- [ ] Check system resource usage
- [ ] Get user feedback on any issues
- [ ] Update documentation
- [ ] Schedule maintenance windows
- [ ] Plan next phase of features

---

## Critical Checklist (Do NOT Deploy Without These)

⚠️ **MUST HAVE BEFORE PRODUCTION:**

1. ✓ HTTPS/SSL enabled and working
2. ✓ All 7 collections created with correct schema
3. ✓ API keys generated (separate frontend & backend)
4. ✓ CORS origins configured correctly
5. ✓ Authentication working (signup/login/logout)
6. ✓ File uploads working to Storage
7. ✓ Database backups automated
8. ✓ Firewall properly configured
9. ✓ Domain DNS records verified
10. ✓ Admin password strong and saved securely

---

## Quick Deployment Commands

```bash
# On your local machine:

# 1. Generate secure values
openssl rand -hex 32  # For OPENSSL_KEY_V1
openssl rand -hex 32  # For OPENSSL_KEY_V2
openssl rand -base64 32  # For DB_PASSWORD

# 2. SSH into VPS and run setup
ssh root@148.230.66.192

# 3. On VPS: Clone and configure
mkdir -p ~/appwrite && cd ~/appwrite
git clone https://github.com/appwrite/appwrite.git .

# 4. Copy provided docker-compose.yml and .env
# (Or create manually with values from above)

# 5. Start Appwrite
docker compose up -d && sleep 60

# 6. Verify
docker ps
curl http://localhost/health

# 7. Install Nginx & SSL
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.dealpost.in -d dealpost.in

# 8. Configure Nginx with provided config
sudo cp nginx.conf.appwrite /etc/nginx/sites-available/appwrite
sudo ln -s /etc/nginx/sites-available/appwrite /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. Access Appwrite Console
# Browser: https://api.dealpost.in
# Create admin account & project

# 10. Create collections (see appwrite-collections.md)

# 11. Frontend integration
cd ~/dealpost/frontend
npm install appwrite
# Update .env with credentials
# Copy appwrite.js service file
# Copy hooks/useAppwriteAuth.js

# 12. Backend integration
cd ~/dealpost/backend
npm install node-appwrite
# Update .env with credentials
# Copy services/appwrite.js

# 13. Test end-to-end
npm run dev  # Frontend
npm run dev  # Backend (in another terminal)
# Sign up, create listing, send message, etc.

# 14. Monitor
docker compose logs -f
docker stats
```

---

## Rollback Plan

If something goes wrong:

```bash
# Stop all services
docker compose stop

# Restore from backup
docker exec appwrite-mariadb mysql -u appwrite -p appwrite < backup_$(date +%Y%m%d).sql

# Restart
docker compose start

# Restart Nginx if issues
sudo systemctl restart nginx

# Revert code changes if needed
cd ~/dealpost
git revert <commit-hash>
git push origin main
```

---

## Support & Escalation

**Issue Level 1** (Quick fixes):

- Clear browser cache
- Restart services: `docker compose restart`
- Check logs: `docker compose logs`

**Issue Level 2** (Troubleshooting):

- Check firewall: `sudo ufw status`
- Verify DNS: `nslookup api.dealpost.in`
- Check SSL: `sudo certbot certificates`
- Review Appwrite console for errors

**Issue Level 3** (Professional support):

- Post issue on Appwrite Discord: https://appwrite.io/discord
- Stack Overflow tag: `appwrite`
- GitHub Issues: https://github.com/appwrite/appwrite/issues
- Professional Support (if licensed)

---

**Estimated Deployment Time:** 2-4 hours
**Estimated Testing Time:** 1-2 hours
**Total Time to Production:** 3-6 hours

Good luck! 🚀

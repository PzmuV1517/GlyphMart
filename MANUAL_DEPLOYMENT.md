# GlyphMart Manual Deployment Guide (No Docker)

## Prerequisites

- Ubuntu 20.04+ (or similar Linux distribution)
- Python 3.8+
- Nginx already configured and serving your frontend
- Domain name pointing to your server

## Backend Setup

### 1. Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and development tools
sudo apt install python3 python3-pip python3-venv python3-dev -y

# Install image processing dependencies (for PIL/Pillow)
sudo apt install libjpeg-dev zlib1g-dev -y
```

### 2. Setup Backend

```bash
# Navigate to your GlyphMart directory
cd /path/to/your/GlyphMart/Backend

# Make startup script executable
chmod +x start-backend.sh

# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create uploads directory
mkdir -p uploads/images uploads/apks uploads/profile
```

### 3. Configure Environment

Your `.env` file is already configured. Make sure to:

1. **Change the SECRET_KEY** to a secure random string:
```bash
# Generate a secure secret key
python3 -c "import secrets; print(secrets.token_hex(32))"
```

2. **Update ALLOWED_ORIGINS** if needed:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4. Test Backend

```bash
# Start backend manually for testing
./start-backend.sh
```

The backend should start on `http://127.0.0.1:5000`

### 5. Setup Nginx Reverse Proxy

Add this to your existing Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Your existing frontend configuration
    location / {
        root /path/to/your/GlyphMart/Website/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # NEW: Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # File upload support
        client_max_body_size 50M;
        proxy_read_timeout 60s;
    }
}
```

Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup Systemd Service (Auto-start)

```bash
# Copy service file to systemd
sudo cp glyphmart-backend.service /etc/systemd/system/

# Edit the service file with correct paths
sudo nano /etc/systemd/system/glyphmart-backend.service

# Replace these placeholders with your actual paths:
# - /path/to/your/GlyphMart/Backend (appears 3 times)
# - Change User/Group if needed (current: www-data)

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable glyphmart-backend
sudo systemctl start glyphmart-backend

# Check status
sudo systemctl status glyphmart-backend
```

### 7. File Permissions

```bash
# Make sure uploads directory is writable
sudo chown -R www-data:www-data uploads/
sudo chmod -R 755 uploads/
```

## Management Commands

### Start/Stop Backend Service
```bash
# Start
sudo systemctl start glyphmart-backend

# Stop
sudo systemctl stop glyphmart-backend

# Restart
sudo systemctl restart glyphmart-backend

# Check status
sudo systemctl status glyphmart-backend

# View logs
sudo journalctl -u glyphmart-backend -f
```

### Manual Start (for testing)
```bash
cd /path/to/your/GlyphMart/Backend
./start-backend.sh
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Restart backend
sudo systemctl restart glyphmart-backend

# Rebuild frontend if needed
cd Website
npm run build
# Copy new build to your nginx directory
```

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
sudo journalctl -u glyphmart-backend -n 50

# Check if port is in use
sudo netstat -tlnp | grep :5000

# Test manually
cd Backend
source venv/bin/activate
python app.py
```

### API Requests Failing
```bash
# Test backend directly
curl http://127.0.0.1:5000/api/health

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### File Upload Issues
```bash
# Check permissions
ls -la uploads/

# Fix permissions if needed
sudo chown -R www-data:www-data uploads/
sudo chmod -R 755 uploads/
```

## Security Notes

- Backend runs on localhost (127.0.0.1) - not accessible from outside
- All external access goes through Nginx reverse proxy
- File uploads are validated and size-limited
- Authentication required for most endpoints
- Rate limiting configured

## Monitoring

### Check System Resources
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check backend process
ps aux | grep gunicorn
```

### Setup Log Rotation
```bash
# Add to /etc/logrotate.d/glyphmart
sudo tee /etc/logrotate.d/glyphmart > /dev/null <<EOF
/var/log/glyphmart/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    copytruncate
}
EOF
```

Your GlyphMart backend is now ready for production! 🚀

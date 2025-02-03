#!/bin/bash
apt update -y
apt install -y python3 python3-pip nginx

cd /home/insurebuzzreport/patent-automation-backend
pip3 install -r requirements.txt

# Create a systemd service file
cat <<EOF > /etc/systemd/system/flaskapp.service
[Unit]
Description=Flask Application
After=network.target

[Service]
User=your-user
WorkingDirectory=/home/insurebuzzreport/patent-automation-backend
ExecStart=/usr/bin/python3 app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable Flask service
systemctl daemon-reload
systemctl enable flaskapp
systemctl start flaskapp


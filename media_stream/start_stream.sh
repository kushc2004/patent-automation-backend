# media_stream/start_stream.sh

#!/bin/bash

# Start Xvfb
Xvfb :99 -screen 0 1280x720x24 &

# Export DISPLAY
export DISPLAY=:99

# Start FFmpeg to capture the virtual display and stream via RTMP to Janus
ffmpeg -f x11grab -r 30 -s 1280x720 -i :99 -c:v libx264 -preset ultrafast -f flv rtmp://localhost:8000/stream/1

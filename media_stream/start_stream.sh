#!/bin/bash

# Start Xvfb
Xvfb :99 -screen 0 1280x720x24 &

# Export DISPLAY
export DISPLAY=:99

# Start FFmpeg to capture the virtual display and output HLS
ffmpeg -f x11grab -r 30 -s 1280x720 -i :99 \
       -c:v libx264 -preset ultrafast -f hls \
       -hls_time 2 -hls_list_size 10 -hls_flags delete_segments \
       /opt/janus/etc/janus/media/stream1.m3u8

# utils/webrtc_publisher.py

import asyncio
import json
import uuid
import aiohttp
from aiortc import RTCPeerConnection, VideoStreamTrack, RTCConfiguration, RTCIceServer, RTCSessionDescription
from aiortc.mediastreams import VideoFrame
from utils.logger import log_info, log_error
import cv2
import numpy as np

class LiveVideoStreamTrack(VideoStreamTrack):
    """
    A custom VideoStreamTrack that captures live frames from Playwright and streams them via WebRTC.
    """
    kind = "video"

    def __init__(self, page):
        super().__init__()
        self.page = page
        self.running = True

    async def recv(self):
        if not self.running:
            raise asyncio.CancelledError()

        try:
            # Capture a screenshot as a byte array
            screenshot = await self.page.screenshot()
            # Convert the screenshot to a NumPy array
            img = cv2.imdecode(np.frombuffer(screenshot, np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Failed to decode screenshot.")

            # Convert BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Create a VideoFrame
            frame = VideoFrame.from_ndarray(img, format="rgb24")
            frame.pts = None
            frame.time_base = None

            await asyncio.sleep(1 / 10)  # 10 FPS
            return frame
        except Exception as e:
            log_error(f"LiveVideoStreamTrack Error: {str(e)}")
            return None

    async def stop(self):
        try:
            self.running = False
            await super().stop()
        except Exception as e:
            log_error(f"LiveVideoStreamTrack Stop Error: {str(e)}")


class WebRTCPublisher:
    """
    Manages the WebRTC connection to Janus's VideoRoom plugin.
    """
    def __init__(self, janus_url, room_id, display, page):
        self.janus_url = janus_url
        self.room_id = room_id
        self.display = display
        self.page = page
        self.pc = None
        self.session_id = None
        self.handle_id = None
        self.transaction_map = {}
        self.answer_future = asyncio.get_event_loop().create_future()

    async def start_publishing(self):
        """
        Initiates the WebRTC connection to Janus as a publisher.
        """
        try:
            # Configure ICE servers
            config = RTCConfiguration([
                RTCIceServer(urls=["stun:stun.l.google.com:19302"])
            ])
            self.pc = RTCPeerConnection(configuration=config)

            # Add live video track
            self.video_track = LiveVideoStreamTrack(self.page)
            self.pc.addTrack(self.video_track)

            # Create offer
            offer = await self.pc.createOffer()
            await self.pc.setLocalDescription(offer)

            async with aiohttp.ClientSession() as session:
                try:
                    # Create Janus session
                    create_session_msg = {
                        "janus": "create",
                        "transaction": str(uuid.uuid4())
                    }
                    async with session.post(self.janus_url, json=create_session_msg) as resp:
                        response = await resp.json()
                        if response.get("janus") != "success":
                            log_error("WebRTCPublisher: Failed to create Janus session.")
                            return
                        self.session_id = response["data"]["id"]
                        log_info(f"WebRTCPublisher: Created Janus session {self.session_id}.")
                except Exception as e:
                    log_error(f"WebRTCPublisher Error in session creation: {str(e)}")
                    return

                try:
                    # Attach to VideoRoom plugin
                    attach_msg = {
                        "janus": "attach",
                        "plugin": "janus.plugin.videoroom",
                        "transaction": str(uuid.uuid4())
                    }
                    async with session.post(f"{self.janus_url}/{self.session_id}", json=attach_msg) as resp:
                        response = await resp.json()
                        if response.get("janus") != "success":
                            log_error("WebRTCPublisher: Failed to attach to VideoRoom plugin.")
                            return
                        self.handle_id = response["data"]["id"]
                        log_info(f"WebRTCPublisher: Attached to VideoRoom plugin with handle {self.handle_id}.")
                except Exception as e:
                    log_error(f"WebRTCPublisher Error in plugin attachment: {str(e)}")
                    return

                try:
                    # Join the room as a publisher
                    join_msg = {
                        "janus": "message",
                        "body": {
                            "request": "join",
                            "room": self.room_id,
                            "ptype": "publisher",
                            "display": self.display
                        },
                        "transaction": str(uuid.uuid4())
                    }
                    async with session.post(f"{self.janus_url}/{self.session_id}/{self.handle_id}", json=join_msg) as resp:
                        response = await resp.json()
                        if response.get("janus") != "success":
                            log_error("WebRTCPublisher: Failed to join VideoRoom as publisher.")
                            return
                        log_info(f"WebRTCPublisher: Joined room {self.room_id} as publisher.")
                except Exception as e:
                    log_error(f"WebRTCPublisher Error in joining room: {str(e)}")
                    return

                try:
                    if self.pc.localDescription is None:
                        log_error("WebRTCPublisher: Local description is not set.")
                        return

                    jsep = {
                        "type": self.pc.localDescription.type,
                        "sdp": self.pc.localDescription.sdp
                    }

                    # Send configure message with SDP offer
                    configure_msg = {
                        "janus": "message",
                        "body": {
                            "request": "configure",
                            "audio": False,
                            "video": True
                        },
                        "jsep": jsep,
                        "transaction": str(uuid.uuid4())
                    }
                    async with session.post(f"{self.janus_url}/{self.session_id}/{self.handle_id}", json=configure_msg) as resp:
                        response = await resp.json()
                        if response.get("janus") != "success":
                            log_error("WebRTCPublisher: Failed to configure VideoRoom.")
                            return
                        log_info("WebRTCPublisher: Sent configure message to Janus.")

                        # Handle SDP answer from Janus
                        jsep_response = response.get("jsep")
                        if jsep_response:
                            await self.pc.setRemoteDescription(RTCSessionDescription(
                                sdp=jsep_response["sdp"],
                                type=jsep_response["type"]
                            ))
                            log_info("WebRTCPublisher: Set remote description from Janus.")
                except Exception as e:
                    log_error(f"WebRTCPublisher Error in configuring session: {str(e)}")
                    return

            # Monitor connection state
            @self.pc.on("connectionstatechange")
            async def on_connectionstatechange():
                log_info(f"WebRTCPublisher: Connection state changed to {self.pc.connectionState}")
                if self.pc.connectionState in ["failed", "closed"]:
                    await self.stop_publishing()

        except Exception as e:
            log_error(f"WebRTCPublisher Start Error: {str(e)}")

    async def stop_publishing(self):
        """
        Closes the WebRTC connection and cleans up.
        """
        try:
            if self.pc:
                await self.pc.close()
                log_info("WebRTCPublisher: Closed WebRTC connection.")
            if self.session_id:
                async with aiohttp.ClientSession() as session:
                    try:
                        destroy_session_msg = {
                            "janus": "destroy",
                            "transaction": str(uuid.uuid4())
                        }
                        async with session.post(f"{self.janus_url}/{self.session_id}", json=destroy_session_msg) as resp:
                            response = await resp.json()
                            if response.get("janus") == "success":
                                log_info(f"WebRTCPublisher: Destroyed Janus session {self.session_id}.")
                    except Exception as e:
                        log_error(f"WebRTCPublisher Error in destroying session: {str(e)}")
            if hasattr(self, 'video_track'):
                await self.video_track.stop()
        except Exception as e:
            log_error(f"WebRTCPublisher Stop Error: {str(e)}")

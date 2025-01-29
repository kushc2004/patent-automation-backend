# utils/helper_functions.py
import base64
import os
from typing import Any, Dict

def decode_base64_file(file_b64: str, session_id: str, field_name: str) -> str:
    """Decodes a base64 file and saves it temporarily."""
    try:
        header, encoded = file_b64.split(',', 1) if ',' in file_b64 else (None, file_b64)
        file_extension = header.split('/')[1].split(';')[0] if header else 'png'
        file_path = f"temp_{session_id}_{field_name}.{file_extension}"
        with open(file_path, "wb") as f:
            f.write(base64.b64decode(encoded))
        return file_path
    except Exception as e:
        print(f"Error decoding file: {e}")
        return ""

def encode_file_to_base64(file_path: str) -> str:
    """Encodes a file to base64."""
    try:
        with open(file_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode('utf-8')
        return encoded
    except Exception as e:
        print(f"Error encoding file: {e}")
        return ""

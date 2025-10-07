#!/usr/bin/env python3
"""
Webhook handler for Make.com integration
Provides HTTP endpoint to receive processing requests and return manifest data
"""

import os
import json
import time
import logging
import threading
from pathlib import Path
from typing import Dict, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import requests

from main import HighlightsBot
from util import generate_run_id, HighlightsLogger

class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Make.com webhooks"""

    def __init__(self, *args, bot_manager=None, **kwargs):
        self.bot_manager = bot_manager
        super().__init__(*args, **kwargs)

    def do_POST(self):
        """Handle POST requests for processing"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            # Parse request
            request_data = json.loads(post_data.decode('utf-8'))

            # Validate request
            if not self._validate_request(request_data):
                self._send_error(400, "Invalid request format")
                return

            # Extract file paths
            match_video = request_data.get('match_video')
            events_file = request_data.get('events_file')
            callback_url = request_data.get('callback_url')

            # Start processing in background
            processing_thread = threading.Thread(
                target=self._process_async,
                args=(match_video, events_file, callback_url)
            )
            processing_thread.daemon = True
            processing_thread.start()

            # Return immediate response
            self._send_json_response({
                'status': 'accepted',
                'message': 'Processing started',
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            })

        except Exception as e:
            logging.error(f"Webhook error: {str(e)}")
            self._send_error(500, f"Server error: {str(e)}")

    def do_GET(self):
        """Handle GET requests for status"""
        try:
            # Parse query parameters
            parsed_url = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_url.query)

            if parsed_url.path == '/status':
                self._handle_status_request(query_params)
            elif parsed_url.path == '/health':
                self._send_json_response({'status': 'healthy', 'service': 'highlights-bot'})
            else:
                self._send_error(404, "Not found")

        except Exception as e:
            logging.error(f"GET request error: {str(e)}")
            self._send_error(500, f"Server error: {str(e)}")

    def _validate_request(self, data: Dict) -> bool:
        """Validate incoming request data"""
        required_fields = ['match_video', 'events_file']
        return all(field in data for field in required_fields)

    def _process_async(self, match_video: str, events_file: str, callback_url: Optional[str]):
        """Process match asynchronously and send results via callback"""
        try:
            # Initialize bot
            bot = HighlightsBot()

            # Process match
            results = bot.process_match(match_video, events_file)

            # Send callback if URL provided
            if callback_url and results['success']:
                self._send_callback(callback_url, results)

        except Exception as e:
            logging.error(f"Async processing error: {str(e)}")

    def _send_callback(self, callback_url: str, results: Dict):
        """Send processing results to callback URL"""
        try:
            callback_data = {
                'status': 'completed' if results['success'] else 'failed',
                'run_id': results['run_id'],
                'highlights_reel': results.get('highlights_reel'),
                'manifest_path': results.get('manifest'),
                'total_clips': len(results.get('clips', {})),
                'processing_time': results.get('processing_time', 0),
                'errors': results.get('errors', [])
            }

            response = requests.post(
                callback_url,
                json=callback_data,
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )

            if response.status_code == 200:
                logging.info(f"Callback sent successfully to {callback_url}")
            else:
                logging.warning(f"Callback failed: {response.status_code}")

        except Exception as e:
            logging.error(f"Callback error: {str(e)}")

    def _handle_status_request(self, query_params: Dict):
        """Handle status check requests"""
        run_id = query_params.get('run_id', [None])[0]

        if run_id:
            # Check specific run status
            log_file = Path(f"logs/run_{run_id}.json")
            if log_file.exists():
                try:
                    with open(log_file, 'r') as f:
                        log_data = json.load(f)

                    status_data = {
                        'run_id': run_id,
                        'status': 'completed' if log_data.get('end_time') else 'running',
                        'start_time': log_data.get('start_time'),
                        'end_time': log_data.get('end_time'),
                        'total_clips': len(log_data.get('clips', [])),
                        'errors': log_data.get('errors', [])
                    }

                    self._send_json_response(status_data)
                except Exception as e:
                    self._send_error(500, f"Failed to read run status: {str(e)}")
            else:
                self._send_error(404, f"Run {run_id} not found")
        else:
            # General status
            self._send_json_response({
                'service': 'highlights-bot',
                'status': 'running',
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            })

    def _send_json_response(self, data: Dict, status_code: int = 200):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        response_text = json.dumps(data, indent=2)
        self.wfile.write(response_text.encode('utf-8'))

    def _send_error(self, status_code: int, message: str):
        """Send error response"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        error_data = {
            'error': message,
            'status_code': status_code,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }

        response_text = json.dumps(error_data)
        self.wfile.write(response_text.encode('utf-8'))

    def log_message(self, format, *args):
        """Override to use standard logging"""
        logging.info(format % args)

class BotManager:
    """Manages bot instances and processing queue"""

    def __init__(self):
        self.active_runs = {}
        self.setup_logging()

    def setup_logging(self):
        """Setup logging for webhook server"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/webhook_server.log'),
                logging.StreamHandler()
            ]
        )

def create_handler_class(bot_manager):
    """Create handler class with bot_manager"""
    def handler(*args, **kwargs):
        return WebhookHandler(*args, bot_manager=bot_manager, **kwargs)
    return handler

def start_webhook_server(port: int = 8080, host: str = '0.0.0.0'):
    """Start the webhook server"""
    bot_manager = BotManager()
    handler_class = create_handler_class(bot_manager)

    server = HTTPServer((host, port), handler_class)

    logging.info(f"Starting webhook server on {host}:{port}")
    print(f"🚀 Highlights Bot webhook server running on http://{host}:{port}")
    print(f"📡 Endpoints:")
    print(f"   POST /        - Process match (expects JSON with match_video, events_file)")
    print(f"   GET  /status  - Check server/run status")
    print(f"   GET  /health  - Health check")
    print(f"📝 Logs: logs/webhook_server.log")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped by user")
        server.shutdown()

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Highlights Bot Webhook Server')
    parser.add_argument('--port', type=int, default=8080, help='Server port')
    parser.add_argument('--host', default='0.0.0.0', help='Server host')

    args = parser.parse_args()

    start_webhook_server(args.port, args.host)
#!/usr/bin/env python3
"""Static server for the game + diagnostic log collector.

Serves /home/ubuntu/lemur-game on port 8090 (same as before) and accepts
POST /log with a JSON body, appending one line per session episode to
~/lemur-game-logs/sessions.jsonl for playtest analysis.

Run with:  nohup python3 server.py > /dev/null 2>&1 &
"""
import http.server
import os

PORT = 8090
ROOT = os.path.dirname(os.path.abspath(__file__))
LOGDIR = os.path.expanduser('~/lemur-game-logs')
LOGFILE = os.path.join(LOGDIR, 'sessions.jsonl')
MAX_BODY = 2_000_000  # cap a single episode at 2 MB
MAX_LOGFILE = 50_000_000  # stop appending past 50 MB (runaway guard)

os.makedirs(LOGDIR, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_POST(self):
        if self.path != '/log':
            self.send_response(404)
            self.end_headers()
            return
        try:
            n = min(int(self.headers.get('Content-Length', 0)), MAX_BODY)
            data = self.rfile.read(n)
            if (not os.path.exists(LOGFILE)
                    or os.path.getsize(LOGFILE) < MAX_LOGFILE):
                with open(LOGFILE, 'ab') as f:
                    f.write(data.replace(b'\n', b' ') + b'\n')
            self.send_response(204)
        except Exception:
            self.send_response(500)
        self.end_headers()

    def log_message(self, *args):
        pass  # keep nohup output quiet


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('', PORT), Handler).serve_forever()

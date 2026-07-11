#!/usr/bin/env python3
"""Static server for the game + diagnostic log collector.

Serves /home/ubuntu/lemur-game on port 8090 (same as before) and accepts
POST /log with a JSON body, appending one line per session episode to
~/lemur-game-logs/sessions.jsonl for playtest analysis.

Run with:  nohup python3 server.py > /dev/null 2>&1 &
"""
import http.server
import json
import os

PORT = 8090
ROOT = os.path.dirname(os.path.abspath(__file__))
LOGDIR = os.path.expanduser('~/lemur-game-logs')
LOGFILE = os.path.join(LOGDIR, 'sessions.jsonl')
MAX_BODY = 2_000_000  # cap a single episode at 2 MB
MAX_LOGFILE = 50_000_000  # stop appending past 50 MB (runaway guard)
MAX_EVENTS = 6000  # matches the game's own ring buffer cap
# Shared static token; the page is public so this is spam filtering,
# not authentication. It keeps scanner/CSRF junk out of the log.
LOG_TOKEN = 'lemurboy-go7'

os.makedirs(LOGDIR, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_POST(self):
        if self.path != '/log?k=' + LOG_TOKEN:
            self.send_response(404)
            self.end_headers()
            return
        try:
            n = max(0, min(int(self.headers.get('Content-Length', 0)), MAX_BODY))
            data = self.rfile.read(n)
            episode = self.validate(data)
            if episode is not None and (
                    not os.path.exists(LOGFILE)
                    or os.path.getsize(LOGFILE) < MAX_LOGFILE):
                with open(LOGFILE, 'a') as f:
                    # re-serialized by us: guaranteed one clean JSON object
                    # per line, no raw client bytes reach the log
                    f.write(json.dumps(episode) + '\n')
            self.send_response(204)
        except Exception:
            self.send_response(500)
        self.end_headers()

    @staticmethod
    def validate(data):
        """Accept only the episode shape the game sends."""
        try:
            d = json.loads(data)
        except Exception:
            return None
        if not isinstance(d, dict) or d.get('v') != 1:
            return None
        if not isinstance(d.get('ev'), list) or len(d['ev']) > MAX_EVENTS:
            return None
        if d.get('outcome') not in ('death', 'clear', 'lost'):
            return None
        return {
            'v': 1,
            'lvl': d.get('lvl') if isinstance(d.get('lvl'), int) else 0,
            'outcome': d['outcome'],
            'at': d.get('at') if isinstance(d.get('at'), (int, float)) else 0,
            'shards': d.get('shards') if isinstance(d.get('shards'), int) else 0,
            'ev': [e for e in d['ev'] if isinstance(e, dict)],
        }

    def log_message(self, *args):
        pass  # keep nohup output quiet


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('', PORT), Handler).serve_forever()

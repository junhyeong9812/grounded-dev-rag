#!/usr/bin/env python3
"""claude-bridge — .9 호스트에서 claude-code 실행(api 컨테이너엔 node·claude·인증 없음).
Spring api(컨테이너)가 HTTP로 호출: POST /run {prompt, session_id?} → {session_id, answer}.
호스트 실행(nohup/systemd). 위험 도구 전부 차단. 내부 LAN 전용(외부 노출 금지).
학습 Q&A(P3) 전용 — 게이트(StudyAuthInterceptor)는 Spring이 책임, bridge는 신뢰 내부 호출만 받음."""
import json, os, subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CLAUDE = os.path.expanduser("~/.local/bin/claude")
DISALLOWED = ",".join([
    "Bash", "Edit", "Write", "NotebookEdit", "Read", "Task", "Workflow", "WebFetch", "WebSearch",
    "Skill", "CronCreate", "CronDelete", "CronList", "RemoteTrigger", "DesignSync", "EnterWorktree",
    "ExitWorktree", "Monitor", "PushNotification", "ScheduleWakeup", "SendMessage", "ToolSearch",
    "TaskCreate", "TaskGet", "TaskList", "TaskOutput", "TaskStop", "TaskUpdate",
])


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n))
            prompt = body.get("prompt", "")
            sid = body.get("session_id")
            cmd = [CLAUDE, "-p", "--output-format", "stream-json", "--verbose",
                   "--include-partial-messages", "--disallowedTools", DISALLOWED]
            if sid:
                cmd += ["--resume", sid]
            p = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=300)
            session_id, answer = sid, ""
            for line in p.stdout.splitlines():
                try:
                    e = json.loads(line)
                    if e.get("subtype") == "init":
                        session_id = e.get("session_id")
                    elif e.get("type") == "result":
                        answer = e.get("result", "")
                except Exception:
                    pass
            self._json(200, {"session_id": session_id, "answer": answer})
        except Exception as ex:
            self._json(500, {"error": str(ex)})

    def _json(self, code, obj):
        out = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 9099), H).serve_forever()

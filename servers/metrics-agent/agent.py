#!/usr/bin/env python3
"""호스트 메트릭 에이전트 — 각 서버(.9·.158·.164)에서 :9100/metrics(JSON) 제공.
호스트 자원(CPU/메모리/디스크/네트워크/load) + GPU(nvidia-smi) + Docker(docker stats).
Spring 모니터링 서비스가 폴링 → PG 저장 → 임계 체크 → 알림.
의존성: python3-psutil(apt). 호스트 systemd 서비스로 실행(컨테이너 아님 — 호스트 가시성 필요).
"""
import json, subprocess, time
from http.server import BaseHTTPRequestHandler, HTTPServer
import psutil

PORT = 9100


def gpu():
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu",
             "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=5).stdout.strip()
        res = []
        for line in out.splitlines():
            u, mu, mt, t = [x.strip() for x in line.split(",")]
            res.append({"util": float(u), "mem_used_mib": float(mu), "mem_total_mib": float(mt),
                        "mem_pct": round(float(mu) / float(mt) * 100, 1), "temp": float(t)})
        return res
    except Exception:
        return []


def docker_stats():
    try:
        out = subprocess.run(
            ["docker", "stats", "--no-stream", "--format", "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}"],
            capture_output=True, text=True, timeout=8).stdout.strip()
        res = []
        for line in out.splitlines():
            p = line.split("|")
            if len(p) >= 4:
                res.append({"name": p[0], "cpu": p[1], "mem": p[2], "mem_pct": p[3]})
        return res
    except Exception:
        return []


def collect():
    vm = psutil.virtual_memory()
    du = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    try:
        load = psutil.getloadavg()
    except Exception:
        load = [0, 0, 0]
    return {
        "ts": time.time(),
        "cpu_pct": psutil.cpu_percent(interval=0.3),
        "load": list(load),
        "mem": {"used": vm.used, "total": vm.total, "pct": vm.percent},
        "disk": {"used": du.used, "total": du.total, "pct": du.percent},
        "net": {"sent": net.bytes_sent, "recv": net.bytes_recv},
        "gpu": gpu(),
        "docker": docker_stats(),
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/metrics":
            body = json.dumps(collect()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/health":
            self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
        else:
            self.send_response(404); self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()

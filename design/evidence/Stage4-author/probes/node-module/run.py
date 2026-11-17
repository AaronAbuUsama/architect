from pathlib import Path
import json, os, signal, socket, subprocess, time, urllib.request
work=Path(__file__).resolve().parent
repo=work.parent.parent
command=['node',str(repo/'packages/prove/node_modules/wrangler/bin/wrangler.js'),'dev','--local','--config',str(work/'wrangler.jsonc'),'--ip','127.0.0.1','--port','19179','--inspector-port','0','--persist-to',str(work/'state')]
env={k:v for k,v in os.environ.items() if k in {'PATH','HOME','TMPDIR','LANG','LC_ALL','HTTPS_PROXY','HTTP_PROXY','NO_PROXY','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE'}}
env.update({'CI':'true','WRANGLER_SEND_METRICS':'false'})
with open(work/'output.log','w') as log:
 process=subprocess.Popen(command,cwd=work,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 status=None;body=''
 try:
  for _ in range(100):
   if process.poll() is not None: break
   try:
    with urllib.request.urlopen('http://127.0.0.1:19179',timeout=.5) as reply: status=reply.status;body=reply.read().decode();break
   except Exception: time.sleep(.1)
 finally:
  if process.poll() is None:
   os.killpg(process.pid,signal.SIGTERM)
   try: process.wait(timeout=10)
   except subprocess.TimeoutExpired: os.killpg(process.pid,signal.SIGKILL);process.wait(timeout=5)
print(json.dumps({'http_status':status,'body':body,'process_exit':process.returncode}))
print((work/'output.log').read_text())

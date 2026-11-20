## world
Worlds.start answered /_world/health after 7413 ms

## 1 the page after the click
Handle: hdl_f9s27w08gwl1s7tg

## 1 the request at the world's door
{
 "method": "POST",
 "path": "/handle/claim",
 "source": "mouse",
 "status": 200,
 "ms": 139,
 "trace": "e01b1dd27c25917f4492a93cc38bee33",
 "parent": "24e962ffbdfaac0a"
}

## 1 handle.resolve through the SDK afterwards
{
 "ok": true,
 "handle": "hdl_f9s27w08gwl1s7tg"
}

## 1 the journal for that trace
[
 {
  "seq": 1,
  "trace": "e01b1dd27c25917f4492a93cc38bee33",
  "operation": "handle.claim",
  "move": "claim",
  "subject": "hdl_f9s27w08gwl1s7tg",
  "event": "HandleClaimed",
  "fields": {
   "handle": "hdl_f9s27w08gwl1s7tg",
   "name": "firstpage"
  }
 }
]

## 1 the server's spans for that trace
[
 "sqlite",
 "sqlite",
 "handle.claim.load",
 "sqlite",
 "handle.claim.load",
 "handle.claim.record",
 "sqlite",
 "BATCH",
 "handle.claim.commit",
 "handle.claim"
]

## 2 one act, fill and send and settle, as the test sees it (ms)
139

## 2 act
{
 "ok": true,
 "steps": [
  {
   "step": 0,
   "ref": "c1",
   "changes": [
    {
     "component": "input",
     "label": "Name",
     "key": "value",
     "value": "helperpage"
    }
   ]
  },
  {
   "step": 1,
   "ref": "c4",
   "result": "pending",
   "changes": [
    {
     "component": "handle-claim",
     "label": "Claim your name",
     "key": "value",
     "value": {
      "handle": "hdl_vo368v8gtyjgpfhd"
     }
    }
   ]
  }
 ],
 "appeared": [],
 "values": {
  "c1 Name": "helperpage",
  "c4 Claim your name": {
   "handle": "hdl_vo368v8gtyjgpfhd"
  }
 }
}

## 2 snapshot after: the verb's value is its answer
[
 {
  "ref": "c1",
  "component": "input",
  "actions": [
   "setValue",
   "clear"
  ],
  "label": "Name",
  "value": "helperpage"
 },
 {
  "ref": "c4",
  "component": "handle-claim",
  "actions": [
   "submit"
  ],
  "label": "Claim your name",
  "value": {
   "handle": "hdl_vo368v8gtyjgpfhd"
  }
 }
]

## 2 the request at the world's door
{
 "method": "POST",
 "path": "/handle/claim",
 "source": "agent",
 "status": 200,
 "ms": 40,
 "trace": "26a210a5f4cb8514a42bb520265f9116",
 "parent": "410aa955fa2954b4"
}

## 2 the journal entry the server wrote for it (no source anywhere in it)
[
 {
  "seq": 2,
  "trace": "26a210a5f4cb8514a42bb520265f9116",
  "operation": "handle.claim",
  "move": "claim",
  "subject": "hdl_vo368v8gtyjgpfhd",
  "event": "HandleClaimed",
  "fields": {
   "handle": "hdl_vo368v8gtyjgpfhd",
   "name": "helperpage"
  }
 }
]

## 2 the server's root span and its attributes (no source anywhere in them)
{
 "traceId": "26a210a5f4cb8514a42bb520265f9116",
 "spanId": "8dd136615d7a26b4",
 "parentSpanId": "410aa955fa2954b4",
 "name": "handle.claim",
 "attrs": {
  "operation": "handle.claim",
  "attempt": 1,
  "call.id": "call_68fjmsfy1ezf11gg",
  "principal.person": "per_cdkdpwi8x7yn9p6l",
  "payload.name": "helperpage",
  "environment": "local",
  "store": "database",
  "move.name": "claim",
  "move.to": "claimed",
  "answer.handle": "hdl_vo368v8gtyjgpfhd"
 },
 "status": 1,
 "ms": 18,
 "start": 1795195576918
}

## 3 act
{
 "ok": false,
 "error": {
  "step": 1,
  "message": "submit on Claim your name (c4) failed: HandleTaken (HN-001)"
 },
 "steps": [
  {
   "step": 0,
   "ref": "c1",
   "changes": [
    {
     "component": "input",
     "label": "Name",
     "key": "value",
     "value": "firstpage"
    }
   ]
  }
 ],
 "appeared": [],
 "values": {
  "c1 Name": "firstpage",
  "c4 Claim your name": null
 }
}

## 3 the request at the world's door
{
 "method": "POST",
 "path": "/handle/claim",
 "source": "agent",
 "status": 422,
 "ms": 26.2,
 "trace": "d9840a33ba2c00d16af8dd30173d6284",
 "parent": "ade3edf4bb997fae"
}

## 3 the journal for that trace
[]

## 3 snapshot after
[
 {
  "ref": "c1",
  "component": "input",
  "actions": [
   "setValue",
   "clear"
  ],
  "label": "Name",
  "value": "firstpage"
 },
 {
  "ref": "c4",
  "component": "handle-claim",
  "actions": [
   "submit"
  ],
  "label": "Claim your name",
  "value": null,
  "error": "HandleTaken (HN-001)"
 }
]

## 3 the page shows
Refused: HandleTaken (HN-001)

## 3 the server's spans for that trace
[
 "sqlite",
 "sqlite",
 "sqlite",
 "handle.claim.load",
 "handle.claim"
]

## 6 each refusal
{
 "release": {
  "ok": false,
  "error": {
   "step": 0,
   "message": "handle-claim c4 takes no release now. It takes: submit."
  },
  "steps": [],
  "appeared": [],
  "values": {
   "c1 Name": "",
   "c4 Claim your name": null
  }
 },
 "setName": {
  "ok": false,
  "error": {
   "step": 0,
   "message": "handle-claim c4 takes no setName now. It takes: submit."
  },
  "steps": [],
  "appeared": [],
  "values": {
   "c1 Name": "",
   "c4 Claim your name": null
  }
 },
 "press": {
  "ok": false,
  "error": {
   "step": 0,
   "message": "handle-claim c4 has nothing to press now."
  },
  "steps": [],
  "appeared": [],
  "values": {
   "c1 Name": "",
   "c4 Claim your name": null
  }
 },
 "badName": {
  "ok": false,
  "error": {
   "step": 1,
   "message": "submit on Claim your name (c4) failed: InvalidPayload (none)"
  },
  "steps": [
   {
    "step": 0,
    "ref": "c1",
    "changes": [
     {
      "component": "input",
      "label": "Name",
      "key": "value",
      "value": "Not A Name!"
     }
    ]
   }
  ],
  "appeared": [],
  "values": {
   "c1 Name": "Not A Name!",
   "c4 Claim your name": null
  }
 }
}

## 6 requests sent meanwhile
0

## measure: /handle/claim at the world's door, ms
[
 {
  "status": 200,
  "ms": 139,
  "source": "mouse"
 },
 {
  "status": 200,
  "ms": 40,
  "source": "agent"
 },
 {
  "status": 422,
  "ms": 26.2,
  "source": "agent"
 }
]


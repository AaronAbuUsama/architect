## world
Worlds.start answered /_world/health after 4449 ms

## 1 the page after the click
Handle: hdl_l1xhsboen0kmsx03

## 1 the request at the world's door
{
 "method": "POST",
 "path": "/handle/claim",
 "source": "person",
 "status": 200,
 "ms": 91.2,
 "trace": "44034a78f0396719135cbd2fcbefe22b",
 "parent": "1c6bcb877e788b67"
}

## 1 handle.resolve through the SDK afterwards
{
 "ok": true,
 "handle": "hdl_l1xhsboen0kmsx03"
}

## 1 the journal for that trace
[
 {
  "seq": 1,
  "trace": "44034a78f0396719135cbd2fcbefe22b",
  "operation": "handle.claim",
  "move": "claim",
  "subject": "hdl_l1xhsboen0kmsx03",
  "event": "HandleClaimed",
  "fields": {
   "handle": "hdl_l1xhsboen0kmsx03",
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
105

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
      "handle": "hdl_vhlfhqrird6p5yhl"
     }
    }
   ]
  }
 ],
 "appeared": [],
 "values": {
  "c1 Name": "helperpage",
  "c4 Claim your name": {
   "handle": "hdl_vhlfhqrird6p5yhl"
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
   "handle": "hdl_vhlfhqrird6p5yhl"
  }
 }
]

## 2 the request at the world's door
{
 "method": "POST",
 "path": "/handle/claim",
 "source": "agent",
 "status": 200,
 "ms": 24.5,
 "trace": "acc9b6845531e48e17c69b87c955a44f",
 "parent": "28d5bf2fdce4293d"
}

## 2 the journal entry the server wrote for it (no source anywhere in it)
[
 {
  "seq": 2,
  "trace": "acc9b6845531e48e17c69b87c955a44f",
  "operation": "handle.claim",
  "move": "claim",
  "subject": "hdl_vhlfhqrird6p5yhl",
  "event": "HandleClaimed",
  "fields": {
   "handle": "hdl_vhlfhqrird6p5yhl",
   "name": "helperpage"
  }
 }
]

## 2 the server's root span and its attributes (no source anywhere in them)
{
 "traceId": "acc9b6845531e48e17c69b87c955a44f",
 "spanId": "d25355b28a763c33",
 "parentSpanId": "28d5bf2fdce4293d",
 "name": "handle.claim",
 "attrs": {
  "operation": "handle.claim",
  "attempt": 1,
  "call.id": "call_vrk7ygndizs7dr7p",
  "principal.person": "per_shwdprmvziy8lgzy",
  "payload.name": "helperpage",
  "environment": "local",
  "store": "database",
  "move.name": "claim",
  "move.to": "claimed",
  "answer.handle": "hdl_vhlfhqrird6p5yhl"
 },
 "status": 1,
 "ms": 11,
 "start": 1795196494122
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
 "ms": 16.5,
 "trace": "152aafcfc79c11ebf351488fb85f124a",
 "parent": "42fa4019d9d76268"
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
  "ms": 91.2,
  "source": "person"
 },
 {
  "status": 200,
  "ms": 24.5,
  "source": "agent"
 },
 {
  "status": 422,
  "ms": 16.5,
  "source": "agent"
 }
]


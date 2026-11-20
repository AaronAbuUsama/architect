## world
Worlds.start answered /_world/health after 4147 ms

## 1 the page after the click
Handle: hdl_rzwpionkzfru80qc

## 1 the request at the world's door
{
 "method": "POST",
 "path": "/handle/claim",
 "source": "mouse",
 "status": 200,
 "ms": 77,
 "trace": "35b24c25dfae5b215bde798a8e9323ea",
 "parent": "ede156020989c762"
}

## 1 handle.resolve through the SDK afterwards
{
 "ok": true,
 "handle": "hdl_rzwpionkzfru80qc"
}

## 1 the journal for that trace
[
 {
  "seq": 1,
  "trace": "35b24c25dfae5b215bde798a8e9323ea",
  "operation": "handle.claim",
  "move": "claim",
  "subject": "hdl_rzwpionkzfru80qc",
  "event": "HandleClaimed",
  "fields": {
   "handle": "hdl_rzwpionkzfru80qc",
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
   "ref": "c3",
   "result": "pending",
   "changes": [
    {
     "component": "handle-claim",
     "label": "Claim your name",
     "key": "value",
     "value": {
      "handle": "hdl_ztscl2h928h618yv"
     }
    }
   ]
  }
 ],
 "appeared": [],
 "values": {
  "c1 Name": "helperpage",
  "c3 Claim your name": {
   "handle": "hdl_ztscl2h928h618yv"
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
  "ref": "c3",
  "component": "handle-claim",
  "actions": [
   "submit"
  ],
  "label": "Claim your name",
  "value": {
   "handle": "hdl_ztscl2h928h618yv"
  }
 }
]

## 2 the request at the world's door
{
 "method": "POST",
 "path": "/handle/claim",
 "source": "agent",
 "status": 200,
 "ms": 47,
 "trace": "bdf702828f1585842d7c2195467c38fb",
 "parent": "81a98bfb5a3d6b0c"
}

## 2 the journal entry the server wrote for it (no source anywhere in it)
[
 {
  "seq": 2,
  "trace": "bdf702828f1585842d7c2195467c38fb",
  "operation": "handle.claim",
  "move": "claim",
  "subject": "hdl_ztscl2h928h618yv",
  "event": "HandleClaimed",
  "fields": {
   "handle": "hdl_ztscl2h928h618yv",
   "name": "helperpage"
  }
 }
]

## 2 the server's root span and its attributes (no source anywhere in them)
{
 "traceId": "bdf702828f1585842d7c2195467c38fb",
 "spanId": "3ffa4f68122d8432",
 "parentSpanId": "81a98bfb5a3d6b0c",
 "name": "handle.claim",
 "attrs": {
  "operation": "handle.claim",
  "attempt": 1,
  "call.id": "call_ge8g7dqwjcrvrkc6",
  "principal.person": "per_bbo4kqi6iek61k4e",
  "payload.name": "helperpage",
  "environment": "local",
  "store": "database",
  "move.name": "claim",
  "move.to": "claimed",
  "answer.handle": "hdl_ztscl2h928h618yv"
 },
 "status": 1,
 "ms": 19,
 "start": 1795195186651
}

## 3 act
{
 "ok": false,
 "error": {
  "step": 1,
  "message": "submit on Claim your name (c3) failed: HandleTaken (HN-001)"
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
  "c3 Claim your name": null
 }
}

## 3 the request at the world's door
{
 "method": "POST",
 "path": "/handle/claim",
 "source": "agent",
 "status": 422,
 "ms": 17.5,
 "trace": "adbed9e40e4c78ff4290fce98598b187",
 "parent": "663bb5d83a2137ee"
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
  "ref": "c3",
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
   "message": "handle-claim c3 takes no release now. It takes: submit."
  },
  "steps": [],
  "appeared": [],
  "values": {
   "c1 Name": "",
   "c3 Claim your name": null
  }
 },
 "setName": {
  "ok": false,
  "error": {
   "step": 0,
   "message": "handle-claim c3 takes no setName now. It takes: submit."
  },
  "steps": [],
  "appeared": [],
  "values": {
   "c1 Name": "",
   "c3 Claim your name": null
  }
 },
 "press": {
  "ok": false,
  "error": {
   "step": 0,
   "message": "handle-claim c3 has nothing to press now."
  },
  "steps": [],
  "appeared": [],
  "values": {
   "c1 Name": "",
   "c3 Claim your name": null
  }
 },
 "badName": {
  "ok": false,
  "error": {
   "step": 1,
   "message": "submit on Claim your name (c3) failed: InvalidPayload (none)"
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
   "c3 Claim your name": null
  }
 }
}

## 6 requests sent meanwhile
0

## measure: /handle/claim at the world's door, ms
[
 {
  "status": 200,
  "ms": 77,
  "source": "mouse"
 },
 {
  "status": 200,
  "ms": 47,
  "source": "agent"
 },
 {
  "status": 422,
  "ms": 17.5,
  "source": "agent"
 }
]


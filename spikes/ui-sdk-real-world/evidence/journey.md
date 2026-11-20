## 4 ortho prove --only, its own world, over HTTP
{
 "ms": 8399,
 "steps": [
  {
   "name": "the same request again answers the same handle and claims nothing",
   "verdict": "pass",
   "failures": []
  },
  {
   "name": "a taken name is refused",
   "verdict": "pass",
   "failures": []
  },
  {
   "name": "another person's request key is not aaron's: still refused",
   "verdict": "pass",
   "failures": []
  },
  {
   "name": "the name still resolves to aaron's handle",
   "verdict": "pass",
   "failures": []
  },
  {
   "name": "the refusal left bob free to claim a name of his own",
   "verdict": "pass",
   "failures": []
  }
 ]
}

## 4 the replay, claim steps through the page, judged by prove's checks
[
 {
  "name": "the same request again answers the same handle and claims nothing",
  "verdict": "pass",
  "failures": [],
  "via": "the page (mouse)",
  "got": {
   "status": 200,
   "body": {
    "handle": "hdl_txq061u6m3kbckni"
   },
   "shown": "Handle: hdl_txq061u6m3kbckni",
   "journal": [],
   "spans": [
    "sqlite",
    "handle.claim"
   ]
  }
 },
 {
  "name": "a taken name is refused",
  "verdict": "pass",
  "failures": [],
  "via": "the page (mouse)",
  "got": {
   "status": 422,
   "body": {
    "_tag": "HandleTaken",
    "code": "HN-001"
   },
   "shown": "Refused: HandleTaken (HN-001)",
   "journal": [],
   "spans": [
    "sqlite",
    "sqlite",
    "sqlite",
    "handle.claim.load",
    "handle.claim"
   ]
  }
 },
 {
  "name": "another person's request key is not aaron's: still refused",
  "verdict": "pass",
  "failures": [],
  "via": "the page (mouse)",
  "got": {
   "status": 422,
   "body": {
    "_tag": "HandleTaken",
    "code": "HN-001"
   },
   "shown": "Refused: HandleTaken (HN-001)",
   "journal": [],
   "spans": [
    "sqlite",
    "sqlite",
    "sqlite",
    "handle.claim.load",
    "handle.claim"
   ]
  }
 },
 {
  "name": "the name still resolves to aaron's handle",
  "verdict": "pass",
  "failures": [],
  "via": "HTTP, as prove",
  "got": {
   "status": 200
  }
 },
 {
  "name": "the refusal left bob free to claim a name of his own",
  "verdict": "pass",
  "failures": [],
  "via": "the page (mouse)",
  "got": {
   "status": 200,
   "body": {
    "handle": "hdl_1ujtdx55j2808nbc"
   },
   "shown": "Handle: hdl_1ujtdx55j2808nbc",
   "journal": [
    "HandleClaimed"
   ],
   "spans": [
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
  }
 }
]


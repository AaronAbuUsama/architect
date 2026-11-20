## 5a act
{
 "ok": true,
 "steps": [
  {
   "step": 0,
   "ref": "c1",
   "changes": [
    {
     "component": "input",
     "label": "Email",
     "key": "value",
     "value": "olga@example.com"
    }
   ]
  },
  {
   "step": 1,
   "ref": "c3",
   "changes": [
    {
     "component": "input",
     "label": "Password",
     "key": "value",
     "value": "[redacted]"
    }
   ]
  }
 ],
 "appeared": [],
 "values": {
  "c1 Email": "olga@example.com",
  "c3 Password": "[redacted]",
  "c6 Sign in": null,
  "c7 Handle": "",
  "c12 Release your name": null
 }
}

## 5a snapshot
[
 {
  "ref": "c1",
  "component": "input",
  "actions": [
   "setValue",
   "clear"
  ],
  "label": "Email",
  "value": "olga@example.com"
 },
 {
  "ref": "c3",
  "component": "input",
  "actions": [
   "setValue",
   "clear"
  ],
  "label": "Password",
  "value": "[redacted]"
 },
 {
  "ref": "c6",
  "component": "session-sign-in",
  "actions": [
   "submit"
  ],
  "label": "Sign in",
  "value": null
 },
 {
  "ref": "c7",
  "component": "input",
  "actions": [
   "setValue",
   "clear"
  ],
  "label": "Handle",
  "value": ""
 },
 {
  "ref": "c12",
  "component": "handle-release",
  "actions": [
   "submit"
  ],
  "label": "Release your name",
  "value": null,
  "confirm": "Free your name and take its public page offline. Anyone may claim the name afterwards."
 }
]

## 5b act
{
 "ok": true,
 "steps": [
  {
   "step": 0,
   "ref": "c1",
   "changes": [
    {
     "component": "input",
     "label": "Email",
     "key": "value",
     "value": "olga@example.com"
    }
   ]
  },
  {
   "step": 1,
   "ref": "c3",
   "changes": [
    {
     "component": "input",
     "label": "Password",
     "key": "value",
     "value": "[redacted]"
    }
   ]
  },
  {
   "step": 2,
   "ref": "c6",
   "result": "pending",
   "changes": [
    {
     "component": "session-sign-in",
     "label": "Sign in",
     "key": "value",
     "value": "[redacted]"
    }
   ]
  }
 ],
 "appeared": [],
 "values": {
  "c1 Email": "olga@example.com",
  "c3 Password": "[redacted]",
  "c6 Sign in": "[redacted]",
  "c7 Handle": "",
  "c12 Release your name": null
 }
}

## 5b snapshot after
[
 {
  "ref": "c1",
  "component": "input",
  "actions": [
   "setValue",
   "clear"
  ],
  "label": "Email",
  "value": "olga@example.com"
 },
 {
  "ref": "c3",
  "component": "input",
  "actions": [
   "setValue",
   "clear"
  ],
  "label": "Password",
  "value": "[redacted]"
 },
 {
  "ref": "c6",
  "component": "session-sign-in",
  "actions": [
   "submit"
  ],
  "label": "Sign in",
  "value": "[redacted]"
 },
 {
  "ref": "c7",
  "component": "input",
  "actions": [
   "setValue",
   "clear"
  ],
  "label": "Handle",
  "value": ""
 },
 {
  "ref": "c12",
  "component": "handle-release",
  "actions": [
   "submit"
  ],
  "label": "Release your name",
  "value": null,
  "confirm": "Free your name and take its public page offline. Anyone may claim the name afterwards."
 }
]

## 5b what the person sees
Session: ses_spike01 · Token: tok-issued-once-0000

## 5b what was sent (the agent filled the password; the send carries it)
[
 {
  "verb": "session.sign-in",
  "payload": {
   "email": "olga@example.com",
   "password": "<as filled>"
  },
  "via": "agent"
 }
]

## 5b BREAK: a refusal on a verb with an issued answer
{
 "ok": false,
 "error": {
  "step": 0,
  "message": "submit on Sign in (c6) failed: [redacted]"
 },
 "steps": [],
 "appeared": [],
 "values": {
  "c1 Email": "olga@example.com",
  "c3 Password": "[redacted]",
  "c6 Sign in": null,
  "c7 Handle": "",
  "c12 Release your name": null
 }
}

## 5c snapshot (no Reason in it)
[
 {
  "ref": "c1",
  "component": "input",
  "label": "Email",
  "actions": [
   "setValue",
   "clear"
  ]
 },
 {
  "ref": "c3",
  "component": "input",
  "label": "Password",
  "actions": [
   "setValue",
   "clear"
  ]
 },
 {
  "ref": "c6",
  "component": "session-sign-in",
  "label": "Sign in",
  "actions": [
   "submit"
  ]
 },
 {
  "ref": "c7",
  "component": "input",
  "label": "Handle",
  "actions": [
   "setValue",
   "clear"
  ]
 },
 {
  "ref": "c12",
  "component": "handle-release",
  "label": "Release your name",
  "actions": [
   "submit"
  ]
 }
]

## 5c act on Reason
{
 "ok": false,
 "error": {
  "step": 0,
  "message": "\"Reason\" isn't available to agents here. Ask the person."
 },
 "steps": [],
 "appeared": [],
 "values": {
  "c1 Email": "",
  "c3 Password": "",
  "c6 Sign in": null,
  "c7 Handle": "",
  "c12 Release your name": null
 }
}

## 5d snapshot: the verb says a person must confirm
{
 "ref": "c12",
 "component": "handle-release",
 "actions": [
  "submit"
 ],
 "label": "Release your name",
 "value": {},
 "confirm": "Free your name and take its public page offline. Anyone may claim the name afterwards."
}

## 5d agent with no allow
{
 "ok": false,
 "error": {
  "step": 1,
  "message": "Needs a person: \"Free your name and take its public page offline. Anyone may claim the name afterwards.\". Ask them to make this change themselves."
 },
 "steps": [
  {
   "step": 0,
   "ref": "c7",
   "changes": [
    {
     "component": "input",
     "label": "Handle",
     "key": "value",
     "value": "hdl_spike01"
    }
   ]
  }
 ],
 "appeared": [],
 "values": {
  "c1 Email": "",
  "c3 Password": "",
  "c6 Sign in": null,
  "c7 Handle": "hdl_spike01",
  "c12 Release your name": null
 }
}

## 5d agent whose person says no
{
 "ok": false,
 "error": {
  "step": 0,
  "message": "The person said no to \"Free your name and take its public page offline. Anyone may claim the name afterwards.\"."
 },
 "steps": [],
 "appeared": [],
 "values": {
  "c1 Email": "",
  "c3 Password": "",
  "c6 Sign in": null,
  "c7 Handle": "hdl_spike01",
  "c12 Release your name": null
 }
}

## 5d agent whose person says yes
{
 "ok": true,
 "steps": [
  {
   "step": 0,
   "ref": "c12",
   "result": "pending",
   "changes": [
    {
     "component": "handle-release",
     "label": "Release your name",
     "key": "value",
     "value": {}
    }
   ]
  }
 ],
 "appeared": [],
 "values": {
  "c1 Email": "",
  "c3 Password": "",
  "c6 Sign in": null,
  "c7 Handle": "hdl_spike01",
  "c12 Release your name": {}
 }
}

## 5d sent
[
 {
  "verb": "handle.release",
  "payload": {
   "handle": "hdl_spike01",
   "reason": ""
  },
  "via": "agent"
 }
]


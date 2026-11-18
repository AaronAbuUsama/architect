| case | HTTP status | HTTP body | loop classification | text the model sees |
|---|---|---|---|---|
| a-plain-error-rs0 | 500 | {"error":"Internal server error"} | OUTCOME UNKNOWN (run stops) | "Error running a-plain-error-rs0: boom: postgres://user:REDACTED-FAKE@db/prod" |
| a-plain-error-rs1 | 500 | {"error":"Internal server error"} | no write (rejected, model may retry) | "Error running a-plain-error-rs1: boom: postgres://user:REDACTED-FAKE@db/prod" |
| b-fiber-failure-rs0 | 500 | {"error":"Internal server error"} | OUTCOME UNKNOWN (run stops) | "Error running b-fiber-failure-rs0: Sold out: 0 places left" |
| b-fiber-failure-rs1 | 500 | {"error":"Internal server error"} | no write (rejected, model may retry) | "Error running b-fiber-failure-rs1: Sold out: 0 places left" |
| c-duck-422-rs0 | 422 | {"error":"Sold out: 0 places left","errorCode":"SoldOut"} | OUTCOME UNKNOWN (run stops) | "Error running c-duck-422-rs0: Sold out: 0 places left" |
| c-duck-422-rs1 | 422 | {"error":"Sold out: 0 places left","errorCode":"SoldOut"} | no write (rejected, model may retry) | "Error running c-duck-422-rs1: Sold out: 0 places left" |
| d1-fail-rs0 | 422 | {"error":"Sold out","errorCode":"SoldOut","details":{"remaining":0}} | OUTCOME UNKNOWN (run stops) | "Error running d1-fail-rs0: Sold out (errorCode: SoldOut)\nError details: {\"remaining\":0}" |
| d1-fail-rs1 | 422 | {"error":"Sold out","errorCode":"SoldOut","details":{"remaining":0}} | no write (rejected, model may retry) | "Error running d1-fail-rs1: Sold out (errorCode: SoldOut)\nError details: {\"remaining\":0}" |
| d2-noWrite-rs0 | 422 | {"error":"Sold out","errorCode":"SoldOut","details":{"remaining":0}} | no write (rejected, model may retry) | "Error running d2-noWrite-rs0: Sold out (errorCode: SoldOut)\nError details: {\"remaining\":0}" |
| d2-noWrite-rs1 | 422 | {"error":"Sold out","errorCode":"SoldOut","details":{"remaining":0}} | no write (rejected, model may retry) | "Error running d2-noWrite-rs1: Sold out (errorCode: SoldOut)\nError details: {\"remaining\":0}" |
| g-noWrite-before-any-write-rs0 | 422 | {"error":"Sold out","errorCode":"SoldOut"} | no write (rejected, model may retry) | "Error running g-noWrite-before-any-write-rs0: Sold out (errorCode: SoldOut)" |
| g-noWrite-before-any-write-rs1 | 422 | {"error":"Sold out","errorCode":"SoldOut"} | no write (rejected, model may retry) | "Error running g-noWrite-before-any-write-rs1: Sold out (errorCode: SoldOut)" |
| h-plain-before-any-write-rs0 | 500 | {"error":"Internal server error"} | no write (rejected, model may retry) | "Error running h-plain-before-any-write-rs0: boom before any write" |
| h-plain-before-any-write-rs1 | 500 | {"error":"Internal server error"} | no write (rejected, model may retry) | "Error running h-plain-before-any-write-rs1: boom before any write" |
| e-generated-refusal-rs0 [worker=soldout] | 422 | {"error":"Sold out: 0 places left","errorCode":"PR-001","details":{"remaining":0}} | no write (rejected, model may retry) | "Error running e-generated-refusal-rs0: Sold out: 0 places left (errorCode: PR-001)\nError details: {\"remaining\":0}" |
| f-generated-defect-rs0 [worker=defect] | 500 | {"error":"Internal server error"} | OUTCOME UNKNOWN (run stops) | "Error running e-generated-refusal-rs0: Worker 500: D1 exploded: secret-connection-detail" |
| e-generated-refusal-rs1 [worker=soldout] | 422 | {"error":"Sold out: 0 places left","errorCode":"PR-001","details":{"remaining":0}} | no write (rejected, model may retry) | "Error running e-generated-refusal-rs1: Sold out: 0 places left (errorCode: PR-001)\nError details: {\"remaining\":0}" |
| f-generated-defect-rs1 [worker=defect] | 500 | {"error":"Internal server error"} | no write (rejected, model may retry) | "Error running e-generated-refusal-rs1: Worker 500: D1 exploded: secret-connection-detail" |

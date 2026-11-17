# Initial scheduling attempt

The first two small concurrent HTTP requests did not overlap the old local R2 read/write window on that run.
The capture is retained unchanged, including its expected-failure exit mismatch. It is not presented as a failing
product guard. The final guard uses eight prebuilt requests with ordinary 512 KiB JSON values to overlap real
workerd/R2 operations without a fake, clock delay, hook or storage shim. Root capture 02 shows the actual defect:
four different payloads were accepted for one revision. Root capture 03 shows the corrected behavior.

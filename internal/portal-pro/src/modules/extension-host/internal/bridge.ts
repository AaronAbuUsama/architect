export const extensionBridge = `<script>
(() => {
  const pending = new Map();
  let serial = 0;
  window.appAction = (name, input = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject });
    parent.postMessage({ type: "portal-action", id, name, input }, "*");
  });
  addEventListener("message", (event) => {
    if (event.source !== parent || !event.data) return;
    if (event.data.type === "portal-context") {
      window.slotContext = event.data.context;
      dispatchEvent(new Event("slot-context"));
    }
    if (event.data.type === "portal-action-result") {
      const request = pending.get(event.data.id);
      if (!request) return;
      pending.delete(event.data.id);
      if (event.data.error) request.reject(new Error(event.data.error));
      else request.resolve(event.data.value);
    }
  });
})();
</script>`;

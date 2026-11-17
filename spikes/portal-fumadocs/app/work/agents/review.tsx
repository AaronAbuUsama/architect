// Save changes opens this: every file the change touches, as a diff in CodeBlock, and "Open pull request". Changes land
// as reviewed pull requests; nothing takes effect until one merges.
import { Button, Chip, Modal } from "@heroui/react";
import { DiffBlock, stat } from "./diff.tsx";
import type { ChangedFile } from "./draft.ts";

export function Review({ files, agent, branch, proposed, onOpen }: { files: ChangedFile[]; agent: string; branch: string; proposed: boolean; onOpen: () => void }) {
  return (
    <Modal>
      <Button variant="primary" isDisabled={!files.length}>Save changes</Button>
      <Modal.Backdrop><Modal.Container size="lg" scroll="inside"><Modal.Dialog className="sm:max-w-3xl">
        <Modal.CloseTrigger />
        <Modal.Header><Modal.Heading>Review the change to {agent}</Modal.Heading><p className="text-sm text-muted">{files.length} file{files.length === 1 ? "" : "s"} on branch <code>{branch}</code>. Running threads keep the settings they started with; new threads use these once the pull request is merged.</p></Modal.Header>
        <Modal.Body className="flex flex-col gap-4">
          {files.map((f) => <div key={f.path} className="flex flex-col gap-1.5"><div className="flex items-center gap-2 text-xs"><code>{f.path}</code><Chip size="sm" variant="soft">{stat(f.diff)}</Chip></div><DiffBlock label={`${f.path} · diff`} text={f.diff.text} /></div>)}
        </Modal.Body>
        <Modal.Footer>
          <Button slot="close" variant="secondary">Keep editing</Button>
          <Button slot="close" variant="primary" onPress={onOpen}>{proposed ? "Update pull request" : "Open pull request"}</Button>
        </Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
  );
}

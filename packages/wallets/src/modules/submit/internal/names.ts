// The two failures of a send that does not confirm are named here, from the identifiers they are exported as, so that the
// failure carries its `_tag` wherever the wallet runs (the compiler names them again from the same identifiers: the same
// name, so naming twice changes nothing).
import { ErrorNames } from "orthograph/server";
import { SendNotConfirmed, SendNotIncluded } from "../../../../blueprint/things/wallet/errors.js";

for (const failure of [SendNotIncluded, SendNotConfirmed]) ErrorNames.name(failure, failure.name);

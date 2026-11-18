import { Blueprint, Schema } from "orthograph";

export const HandleName = Blueprint.value(Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9]{0,31}$/)));
export const LinkTitle = Blueprint.value(Blueprint.text({ max: 120 }));
export const LinkUrl = Blueprint.value(Schema.String.check(
  Schema.isMaxLength(2048),
  Schema.isPattern(/^https?:\/\//),
  Schema.makeFilter((url: string) => URL.canParse(url)),
));
export const LinkPosition = Blueprint.value(Blueprint.uint(32));

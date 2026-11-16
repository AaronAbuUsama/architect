# tokens

The world's test tokens: `Tokens.sign(secret, person)` gives `<person>.<HMAC-SHA256>`, and `Tokens.principals(secret)`
turns a `Bearer` token back into a person principal, or anonymous if the signature is wrong. WebCrypto, so it runs the
same in workerd and Node. The secret is made fresh by `architect dev` for each run and never written to a file.
